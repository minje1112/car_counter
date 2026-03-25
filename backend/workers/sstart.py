#!/usr/bin/env python3
"""
AI Car Counting Worker
Processes frames from RTSP streams and counts cars using YOLOv8
"""

import os
import sys
import json
import time
import logging
import argparse
from datetime import datetime
from pathlib import Path
import shutil
import torch
from collections import defaultdict
from utils import create_regions, is_inside_region, draw_regions
from client import Client
from datetime import datetime, timezone, timedelta
import pandas as pd

# Get the absolute path to the workers directory
WORKERS_DIR = Path(__file__).parent.absolute()
MODEL_DIR = WORKERS_DIR / 'model'

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

try:
    import cv2
    import numpy as np
    from ultralytics import YOLO
    from ultralytics.utils.plotting import colors
    import mysql.connector
    from dotenv import load_dotenv
    import subprocess
except ImportError as e:
    logger.error(f"Missing required package: {e}")
    logger.error("Install with: pip install opencv-python ultralytics mysql-connector-python python-dotenv")
    sys.exit(1)

# Load environment variables
load_dotenv()

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'annotation_db'),
    'port': int(os.getenv('DB_PORT', 3306))
}
conn = mysql.connector.connect(**DB_CONFIG)

MONGOLIA_TZ = timezone(timedelta(hours=8))

class CarCounterAI:
    def __init__(self, model_path=None):
        """Initialize the car counter with YOLO model"""
        # Use absolute path to model file
        if model_path is None:
            model_path = str(MODEL_DIR / 'best_26.pt')
        elif not os.path.isabs(model_path):
            # Convert relative path to absolute
            model_path = str(MODEL_DIR / model_path)
        
        self.model_path = model_path
        self.model = None
        self.car_classes = [0, 1, 2, 6, 7]
        self.annotation_rules = None
        self.preview = True
        self.duration = 1
        
    def set_annotation_rules(self, rules):
        self.annotation_rules = rules
        logger.info(f"Annotation rules set: {rules}")
        
    def load_model(self):
        try:
            logger.info(f"Loading model from {self.model_path}")
            self.model = YOLO(self.model_path).to('cuda' if torch.cuda.is_available() else 'cpu')
            logger.info(f"Model loaded on {'cuda' if torch.cuda.is_available() else 'cpu'}")
            return True
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            return False
    
    def save_count_to_db(self, stream_id, car_count, detections_json):
        try:
            cursor = conn.cursor()
            
            # Limit detections to avoid exceeding column size (keep only first 50)
            limited_detections = detections_json[:50] if isinstance(detections_json, list) else detections_json
            
            query = """
                INSERT INTO ai_car_counts 
                (stream_id, car_count, detections, created_at)
                VALUES (%s, %s, %s, NOW())
            """
            
            cursor.execute(query, (stream_id, car_count, json.dumps(limited_detections)))
            conn.commit()
            
            cursor.close()
            
            logger.info(f"✓ Saved to DB: stream_id={stream_id}, car_count={car_count}, detections={len(limited_detections)}")
            return True
            
        except Exception as e:
            logger.error(f"Database error: {e}")
            return False

def process_stream_frame(stream_id, rtsp_url, frame_output_path, annotation_rules=None):
    """Process video stream and count cars"""
    # Initialize AI counter
    counter = CarCounterAI()
    
    # Set annotation rules if provided
    if annotation_rules:
        if isinstance(annotation_rules, str):
            annotation_rules = json.loads(annotation_rules)
        counter.set_annotation_rules(annotation_rules)
    
    # Load model
    if not counter.load_model():
        logger.error("Failed to load AI model")
        return False
    
    logger.info(f"Connecting to stream: {rtsp_url}")
    
    car_count = 0
    frame_count = 0
    consecutive_none_frames = 0
    max_consecutive_none = 5
    detections = []
    reg_history = defaultdict(list)
    track_history = defaultdict(list)
    category_history = defaultdict(list)
    device_arg = 'cuda:0' if torch.cuda.is_available() else 'cpu'      
    
    # Extract frame using OpenCV
    logger.info(f"Connecting to stream: {rtsp_url}")
    #cap = cv2.VideoCapture(rtsp_url)
    client = Client(rtsp_url,
                    verbose=False,
                    read_timeout=6.0,      # 15 second timeout per frame
                    freeze_threshold=3.0   # 3 seconds without frame = frozen
                    )
    width, height = client.width, client.height
    polygons = annotation_rules.get('polygons', []) if annotation_rules else []
    arrows = annotation_rules.get('arrows', []) if annotation_rules else []
    regions = create_regions(width, height, polygons, arrows) 

    polygon_id_map = {
        polygon['text']: polygon.get('id', polygon.get('label', polygon.get('text')))
        for polygon in polygons
    }
    
    consecutive_none_frames = 0
    max_consecutive_none = 5

    # Initialize interval tracking variables
    past_time = 0
    interval_idx = 0
    current_time = datetime.now(MONGOLIA_TZ).strftime('%Y%m%d_%H%M%S')
    current_interval_counts = defaultdict(int)

    #width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    #height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')

    if counter.preview:
        cv2.namedWindow('frame', cv2.WINDOW_AUTOSIZE)
        
    try:
        while client.isOpened():
            frame = client.read()
            if frame is None:
                consecutive_none_frames += 1
                if consecutive_none_frames >= max_consecutive_none:
                    break
                continue
            else:
                consecutive_none_frames = 0

            frame = frame.copy()
             
            if past_time > counter.duration:
                past_time = 0
                interval_idx += 1
                time = datetime.now(MONGOLIA_TZ).strftime('%Y-%m-%d %H:%M:%S')

                for region in regions:
                    polygon_id = polygon_id_map.get(region.name, region.name)
                    count = current_interval_counts[polygon_id]

                    cursor = conn.cursor()
                    query = """
                        INSERT INTO ai_car_counts 
                        (stream_id, flowId, polygon_id, count, time, interval_idx)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """
                    cursor.execute(query, (stream_id, region.name, polygon_id, count, time, interval_idx))
                    conn.commit()
                    cursor.close()

                    logger.info(f"Saved count to DB: stream_id={stream_id}, flowId={region.name}, polygon_id={polygon_id}, count={count}, time={time}, interval_idx={interval_idx}")

                current_interval_counts = defaultdict(int)
                past_time = 0
                current_time = datetime.now(MONGOLIA_TZ).strftime('%Y%m%d_%H%M%S')

            results = counter.model.track(
                frame, persist=True, conf=0.3, iou=0.3,verbose=False, tracker="bytetrack.yaml",
                device=device_arg, half=torch.cuda.is_available()
            )

            for result in results:
                boxes = result.boxes.xyxy.cpu()  
                if result.boxes.id is None:
                    continue
                track_ids = result.boxes.id.int().cpu().tolist() 
                classes = result.boxes.cls.cpu().tolist() 

                for box, track_id, cls in zip(boxes, track_ids, classes):
                    bbox_center = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
                    cv2.putText(frame, f'{track_id}', (int(bbox_center[0]) - 20, int(bbox_center[1]) - 20), 
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

                    # Update track history for drawing the trajectory
                    track_history[track_id].append((float(bbox_center[0]), float(bbox_center[1])))
                    track_history[track_id] = track_history[track_id][-20:]  # Keep the last 20 points

                    if cls in counter.car_classes:
                        mapped_cls = 0
                    else:
                        mapped_cls = cls
                    category_history[track_id].append(mapped_cls)

                    cv2.circle(frame, (int(bbox_center[0]), int(bbox_center[1])), 5, colors(cls, True), -1)
                    points = np.hstack(track_history[track_id]).astype(np.int32).reshape((-1, 1, 2))
                    cv2.polylines(frame, [points], isClosed=False, color=colors(cls, True), thickness=2)

                    # Check if the object is inside any defined region
                    for region in regions:
                        if is_inside_region(region, bbox_center, reg_history, track_id): 
                            cursor = conn.cursor()
                            query = """
                                    INSERT INTO car_flow_records 
                                    (stream_id, flowId, trackId, category, time_seconds)
                                    VALUES (%s, %s, %s, %s, %s)
                                    """
                            cursor.execute(query, (stream_id, region.name, track_id, mapped_cls, current_time))
                            conn.commit()
                            cursor.close()

                            logger.info(f"Saved count to DB: stream_id={stream_id}, flowId={region.name}, polygon_id={polygon_id}, count={count}, time={time}, interval_idx={interval_idx}")
                                                    
                            polygon_id = polygon_id_map.get(region.name, region.name)
                            current_interval_counts[polygon_id] += 1

            draw_regions(regions, frame)  
            past_time = datetime.now().timestamp() - datetime.strptime(current_time, '%Y%m%d_%H%M%S').timestamp()

            if counter.preview:
                cv2.imshow('frame', frame)
                if cv2.waitKey(25) & 0xFF == ord('q'):
                    break
        
    except: logging.exception("Error during video processing.")
    finally: 
        # Save final interval to database if any data exists
        cursor = conn.cursor()

        if any(current_interval_counts.values()):                        
            for region in regions:
                polygon_id = polygon_id_map.get(region.name, region.name)
                count = current_interval_counts[polygon_id]
                query = """
                        INSERT INTO ai_car_counts 
                        (stream_id, flowId, polygon_id, count, time, interval_idx)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        """
                cursor.execute(query, (stream_id, region.name, polygon_id, count, time, interval_idx))
        
        conn.commit()
        cursor.close()

        logger.info(f"Saved count to DB: stream_id={stream_id}, flowId={region.name}, polygon_id={polygon_id}, count={count}, time={time}, interval_idx={interval_idx}")
                              
        #cap.release()
        conn.close()
        cv2.destroyAllWindows()

if __name__ == '__main__':
    """
    Command line interface for testing
    Usage: python sstart.py --video_path "https://..." --json_path "config.json" --csv_path "output.csv" --save_video --preview
    """
    parser = argparse.ArgumentParser(description='AI Car Counting Video Processor')
    parser.add_argument('--video_path', type=str, required=True, help='Path or URL to video stream')
    parser.add_argument('--json_path', type=str, help='Path to JSON config file')
    parser.add_argument('--csv_path', type=str, help='Path to save CSV results')
    parser.add_argument('--save_video', action='store_true', help='Save processed video output')
    parser.add_argument('--preview', action='store_true', help='Show video preview while processing')
    parser.add_argument('--stream_id', type=int, default=1, help='Stream ID for database')
    
    args = parser.parse_args()
    
    logger.info(f"Starting video processing:")
    logger.info(f"  Video: {args.video_path}")
    logger.info(f"  JSON Config: {args.json_path}")
    logger.info(f"  CSV Output: {args.csv_path}")
    logger.info(f"  Save Video: {args.save_video}")
    logger.info(f"  Preview: {args.preview}")
    
    # Load annotation rules from JSON if provided
    annotation_rules = None
    if args.json_path and os.path.exists(args.json_path):
        try:
            with open(args.json_path, 'r') as f:
                annotation_rules = json.load(f)
                logger.info(f"Loaded annotation rules from {args.json_path}")
        except Exception as e:
            logger.error(f"Failed to load annotation rules: {e}")
    
    # Process video stream
    try:
        result_ok = process_stream_frame(
            stream_id=args.stream_id,
            rtsp_url=args.video_path,
            frame_output_path=args.csv_path,
            annotation_rules=annotation_rules
        )
        
        result = {
            'success': result_ok,
            'video_path': args.video_path,
            'car_count': 0,  # Note: actual count saved to DB by process_stream_frame
            'detections': [],
            'csv_saved': args.csv_path is not None,
            'video_saved': args.save_video,
            'preview_enabled': args.preview,
            'timestamp': datetime.now().isoformat(),
            'message': 'Video processed successfully' if result_ok else 'Video processing completed with errors'
        }
    except Exception as e:
        logger.error(f"Video processing failed: {e}")
        result = {
            'success': False,
            'video_path': args.video_path,
            'car_count': 0,
            'detections': [],
            'csv_saved': False,
            'video_saved': False,
            'preview_enabled': args.preview,
            'timestamp': datetime.now().isoformat(),
            'message': str(e)
        }
    
    print(json.dumps(result, indent=2))
