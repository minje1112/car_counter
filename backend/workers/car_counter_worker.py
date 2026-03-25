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
from datetime import datetime
from pathlib import Path
import shutil

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

class CarCounterAI:
    def __init__(self, model_path='yolov8n.pt'):
        """Initialize the car counter with YOLO model"""
        self.model_path = model_path
        self.model = None
        self.car_classes = [2, 3, 5, 7]  # car, motorcycle, bus, truck in COCO dataset
        self.annotation_rules = None
        
    def set_annotation_rules(self, rules):
        """
        Set annotation rules for counting
        Rules can include:
        - Counting zones (polygons/lines)
        - Direction of counting
        - Object filters
        """
        self.annotation_rules = rules
        logger.info(f"Annotation rules set: {rules}")
        
    def load_model(self):
        """Load YOLO model"""
        try:
            logger.info(f"Loading YOLO model from {self.model_path}")
            self.model = YOLO(self.model_path)
            logger.info("Model loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            return False
    
    def is_point_in_polygon(self, point, polygon):
        """Check if a point is inside a polygon using ray casting algorithm"""
        x, y = point
        n = len(polygon)
        inside = False
        
        p1x, p1y = polygon[0]
        for i in range(1, n + 1):
            p2x, p2y = polygon[i % n]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        
        return inside
    
    def filter_detections_by_annotations(self, detections):
        """
        Filter detections based on annotation rules
        Returns only detections that match the annotation criteria
        """
        if not self.annotation_rules:
            return detections
        
        filtered = []
        
        for detection in detections:
            # Get bounding box center point
            x1, y1, x2, y2 = detection['bbox']
            center_x = (x1 + x2) / 2
            center_y = (y1 + y2) / 2
            
            # Check if detection is within any annotation zone
            for annotation in self.annotation_rules:
                annotation_type = annotation.get('type', '')
                
                # Handle polygon annotations (counting zones)
                if annotation_type == 'polygon':
                    points = annotation.get('points', [])
                    if len(points) >= 3:
                        polygon = [(p['x'], p['y']) for p in points]
                        if self.is_point_in_polygon((center_x, center_y), polygon):
                            filtered.append(detection)
                            break
                
                # Handle line annotations (counting lines)
                elif annotation_type == 'line':
                    # Simple line crossing detection
                    # Can be enhanced to track movement direction
                    filtered.append(detection)
                    break
                
                # Handle rectangle annotations
                elif annotation_type == 'rectangle':
                    rect = annotation.get('rect', {})
                    if rect:
                        rx1, ry1 = rect.get('x', 0), rect.get('y', 0)
                        rx2 = rx1 + rect.get('width', 0)
                        ry2 = ry1 + rect.get('height', 0)
                        
                        if rx1 <= center_x <= rx2 and ry1 <= center_y <= ry2:
                            filtered.append(detection)
                            break
        
        return filtered if filtered else detections
    
    def count_cars_from_frame(self, frame_path, confidence=0.5):
        """
        Count cars in a single frame
        Returns: dict with count and detection details
        """
        try:
            # Read image
            image = cv2.imread(frame_path)
            if image is None:
                raise ValueError(f"Could not read image: {frame_path}")
            detections = []
            # Run inference
            results = self.model(image, conf=confidence, verbose=False)
            
            # Count vehicles
            car_count = 0
            detections = []
            
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    cls = int(box.cls[0])
                    if cls in self.car_classes:
                        conf = float(box.conf[0])
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        
                        detections.append({
                            'class': cls,
                            'confidence': conf,
                            'bbox': [x1, y1, x2, y2]
                        })
            
            # Filter detections based on annotation rules
            filtered_detections = self.filter_detections_by_annotations(detections)
            car_count = len(filtered_detections)
            
            logger.info(f"Total detections: {len(detections)}, Filtered: {car_count}")
            
            return {
                'success': True,
                'car_count': car_count,
                'detections': filtered_detections,
                'total_detections': len(detections),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error counting cars: {e}")
            return {
                'success': False,
                'error': str(e),
                'car_count': 0,
                'detections': []
            }
    
    def save_count_to_db(self, stream_id, car_count, detections_json):
        """Save car count to database"""
        try:
            conn = mysql.connector.connect(**DB_CONFIG)
            cursor = conn.cursor()
            
            query = """
                INSERT INTO ai_car_counts 
                (stream_id, car_count, detections, created_at)
                VALUES (%s, %s, %s, NOW())
            """
            
            cursor.execute(query, (stream_id, car_count, json.dumps(detections_json)))
            conn.commit()
            
            cursor.close()
            conn.close()
            
            logger.info(f"Saved count to DB: stream_id={stream_id}, count={car_count}")
            return True
            
        except Exception as e:
            logger.error(f"Database error: {e}")
            return False

def process_stream_frame(stream_id, rtsp_url, frame_output_path, annotation_rules=None):
    """
    Main function to process a single frame from RTSP stream
    This function is called by the Node.js worker
    Args:
        stream_id: ID of the RTSP stream
        rtsp_url: URL of the RTSP stream (rtsp://, http://, https://, or file path)
        frame_output_path: Path to save the extracted frame
        annotation_rules: JSON string or dict with annotation rules for counting
    """
    try:
        # Initialize AI counter
        counter = CarCounterAI()
        
        # Set annotation rules if provided
        if annotation_rules:
            if isinstance(annotation_rules, str):
                annotation_rules = json.loads(annotation_rules)
            counter.set_annotation_rules(annotation_rules)
        
        # Load model
        if not counter.load_model():
            return {
                'success': False,
                'error': 'Failed to load AI model'
            }
        
        # Extract frame using OpenCV
        logger.info(f"Connecting to stream: {rtsp_url}")
        
        # Determine if URL is RTSP, HTTP(S), or a file path and extract a frame accordingly.
        frame_extracted = False

        if rtsp_url.startswith('rtsp://'):
            # Use OpenCV for RTSP streams (may use FFmpeg backend internally)
            cap = cv2.VideoCapture(rtsp_url)
            if cap.isOpened():
                ret, frame = cap.read()
                cap.release()
                if ret:
                    cv2.imwrite(frame_output_path, frame)
                    frame_extracted = True
                    logger.info(f"Frame saved to {frame_output_path} via OpenCV RTSP")
                else:
                    logger.warning("OpenCV could not read a frame from RTSP stream")
            else:
                logger.warning("OpenCV failed to open RTSP stream; will try FFmpeg as fallback")

        # Handle HTTP/HTTPS streams and RTSP fallback using FFmpeg, which supports HLS/.ts
        if not frame_extracted:
            # If an rtsp.me embed URL, convert to rtsp:// as before
            if rtsp_url.startswith('https://') and 'rtsp.me/embed/' in rtsp_url:
                stream_code = rtsp_url.split('/embed/')[-1].rstrip('/')
                rtsp_url_converted = f"rtsp://rtsp.me/{stream_code}"
                logger.info(f"Converting embed URL to RTSP: {rtsp_url_converted}")
                ffmpeg_input = rtsp_url_converted
            else:
                ffmpeg_input = rtsp_url

            # Determine ffmpeg executable path (allow overriding via FFMPEG_PATH env var)
            ffmpeg_exec = os.getenv('FFMPEG_PATH') or shutil.which('ffmpeg')
            if not ffmpeg_exec:
                logger.error("ffmpeg not found. Please install ffmpeg and make it available on PATH, or set FFMPEG_PATH environment variable.")
                logger.error("Windows: install from https://ffmpeg.org/download.html or use 'choco install ffmpeg' if using Chocolatey.")
                logger.error("Verify by running: ffmpeg -version")
                return {
                    'success': False,
                    'error': 'ffmpeg not found. Install ffmpeg and ensure it is on PATH or set FFMPEG_PATH.'
                }

            # Use ffmpeg to capture a single frame. Uses the located ffmpeg executable.
            ffmpeg_cmd = [
                ffmpeg_exec,
                '-y',
                '-i', ffmpeg_input,
                '-frames:v', '1',
                '-q:v', '2',
                frame_output_path
            ]

            try:
                logger.info(f"Running FFmpeg to extract frame: {' '.join(ffmpeg_cmd)}")
                proc = subprocess.run(ffmpeg_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
                if proc.returncode == 0 and os.path.exists(frame_output_path):
                    frame_extracted = True
                    logger.info(f"Frame saved to {frame_output_path} via FFmpeg")
                else:
                    stderr = proc.stderr.decode('utf-8', errors='ignore') if proc.stderr else ''
                    logger.error(f"FFmpeg failed (rc={proc.returncode}): {stderr}")
            except subprocess.TimeoutExpired:
                logger.error("FFmpeg timed out while extracting frame")
            except Exception as e:
                logger.error(f"Error running FFmpeg: {e}")

        if not frame_extracted:
            logger.error("Failed to extract frame from stream")
            return {
                'success': False,
                'error': f'Failed to extract frame from stream: {rtsp_url}. Ensure the URL is accessible and ffmpeg is installed.'
            }
        
        # Count cars in frame
        result = counter.count_cars_from_frame(frame_output_path)
        
        if result['success']:
            # Save to database
            counter.save_count_to_db(
                stream_id,
                result['car_count'],
                result['detections']
            )
            
            logger.info(f"Stream {stream_id}: Found {result['car_count']} cars (Total detections: {result.get('total_detections', 0)})")
        
        # Cleanup frame file
        try:
            os.remove(frame_output_path)
        except:
            pass
        
        return result
        
    except Exception as e:
        logger.error(f"Error processing stream: {e}")
        return {
            'success': False,
            'error': str(e),
            'car_count': 0
        }

if __name__ == '__main__':
    """
    Command line interface for testing
    Usage: python car_counter_worker.py <stream_id> <rtsp_url> <output_path> [annotation_rules_json]
    """
    if len(sys.argv) < 4:
        print("Usage: python car_counter_worker.py <stream_id> <rtsp_url> <output_path> [annotation_rules_json]")
        sys.exit(1)
    
    stream_id = int(sys.argv[1])
    rtsp_url = sys.argv[2]
    output_path = sys.argv[3]
    annotation_rules = sys.argv[4] if len(sys.argv) > 4 else None
    
    result = process_stream_frame(stream_id, rtsp_url, output_path, annotation_rules)
    print(json.dumps(result))
