import argparse
import os
import json
import numpy as np
import cv2
import pandas as pd
import torch
import logging
from pathlib import Path
from ultralytics.utils.plotting import colors
from ultralytics import YOLO
from shapely.geometry import Polygon, Point
from datetime import datetime
from collections import defaultdict, Counter
from PIL import ImageColor
from utils import Region, calculate_angle, draw_regions
from utils import create_regions, is_inside_region
from tqdm import tqdm
from client import Client

# Get the absolute path to the workers directory
WORKERS_DIR = Path(__file__).parent.absolute()
MODEL_DIR = WORKERS_DIR / 'model'

CLASSES =  [0, 1, 2, 4, 5, 6, 7, 8] 
WEIGHTS = str(MODEL_DIR / 'best_26.pt') 

LINE_THICKNESS = 1
TRACK_THICKNESS = 1
REGION_THICKNESS = 2

def cuda_info():
    print("=" * 50)
    print("CUDA Configuration for Jetson Orin Nano")
    print("=" * 50)
    print(f"CUDA Available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"CUDA Version: {torch.version.cuda}")
        print(f"cuDNN Version: {torch.backends.cudnn.version()}")
        print(f"GPU Count: {torch.cuda.device_count()}")
        for i in range(torch.cuda.device_count()):
            print(f"  Device {i}: {torch.cuda.get_device_name(i)}")
        
        # Set device 0 (usually the GPU)
        torch.cuda.set_device(0)
        torch.cuda.synchronize()
        print(f"Active Device: {torch.cuda.current_device()}")
        print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
    else:
        print("WARNING: CUDA not available. Will use CPU (slower).")
    print("=" * 50)

if torch.cuda.is_available():
    model = YOLO(WEIGHTS).to('cuda')
    print("YOLO loaded on GPU")
class_names = model.model.names

def execute(opt):
    with open(opt.json_path, 'r') as file:
        rule = json.load(file)
    arrows = rule['config']['shapes']['Line']
    polygons = rule['config']['shapes']['Polygon']

    cap = cv2.VideoCapture(opt.video_path)
    if not cap.isOpened():
        print(f"ERROR: Cannot open video source: {opt.video_path}")
        return
    
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    output_dir = 'output'
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate output filename based on input type
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_video_name = f'livestream_{timestamp}_output.mp4'
    output_video_path = f'{output_dir}/{output_video_name}'
    out = cv2.VideoWriter(output_video_path, fourcc, int(fps) if fps > 0 else 30, (width, height))

    client = Client(opt.video_path)
    if opt.preview:
        cv2.namedWindow('frame', cv2.WINDOW_AUTOSIZE)

    # Data storage for tracking and region information
    data = []
    track_history = defaultdict(list)
    category_history = defaultdict(list)
    reg_history = defaultdict(list)
    regions = create_regions(width, height, polygons, arrows)  # Define regions from polygons
    counter = 0
    
    # Create polygon_id map
    polygon_id_map = {
        polygon['text']: polygon.get('id', polygon.get('label', polygon.get('text')))
        for polygon in polygons
    }

    # Time interval tracking (convert minutes to seconds)
    duration = opt.interval * 60
    interval_data = [] 
    current_interval_counts = defaultdict(int)  # Count per polygon_id in current interval
    progress_bar = tqdm(total=int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) if cap.get(cv2.CAP_PROP_FRAME_COUNT) > 0 else float('inf'), desc='Processing Video', position=0, leave=False, ncols=100)
    
    tqdm.write(f"Tracking count every {opt.interval} minute(s)")
    current_time = datetime.now().strftime('%Y%m%d_%H%M%S')
    past_time = 0
    interval_idx = 0
    device_arg = 'cuda:0' if torch.cuda.is_available() else 'cpu'
    
    try:
        while client.isOpened():
            frame = client.read()
            if frame is None:
                break
            
            _frame = frame.copy()
            counter += 1

            if past_time > duration:
                interval_idx += 1
                tqdm.write("+" * 100)
                tqdm.write("+" * 100)
                for region in regions:
                    polygon_id = polygon_id_map.get(region.name, region.name)
                    count = current_interval_counts[polygon_id]
                    interval_data.append({
                        'flowId': region.name,
                        'polygon_id': polygon_id,
                        'count': count,
                        'time' : current_time,
                        'interval_idx': interval_idx
                    })
                    tqdm.write(f"  {region.name} (ID: {polygon_id}): {count} detections")

                current_interval_counts = defaultdict(int)
                past_time = 0
                current_time = datetime.now().strftime('%Y%m%d_%H%M%S')
                tqdm.write("+" * 100)
                tqdm.write("+" * 100)
                
            draw_regions(regions, _frame)  
            
            results = model.track(
                frame, persist=True, conf=0.3, iou=0.3, classes=CLASSES, 
                imgsz=opt.imgsz, verbose=False, tracker="bytetrack.yaml",
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
                    cv2.putText(_frame, f'{track_id}', (int(bbox_center[0]) - 20, int(bbox_center[1]) - 20), 
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), LINE_THICKNESS)

                    # Update track history for drawing the trajectory
                    track_history[track_id].append((float(bbox_center[0]), float(bbox_center[1])))
                    track_history[track_id] = track_history[track_id][-20:]  # Keep the last 20 points

                    # Map all vehicle classes to 'car' (0), others unchanged
                    if cls in [0, 1, 2, 6, 7]:
                        mapped_cls = 0
                    else:
                        mapped_cls = cls
                    category_history[track_id].append(mapped_cls)

                    #category_history[track_id] = category_history[track_id][-20:]

                    #Draw tracking points and trajectory
                    cv2.circle(_frame, (int(bbox_center[0]), int(bbox_center[1])), 5, colors(cls, True), -1)
                    points = np.hstack(track_history[track_id]).astype(np.int32).reshape((-1, 1, 2))
                    cv2.polylines(_frame, [points], isClosed=False, color=colors(cls, True), thickness=TRACK_THICKNESS)

                    # Check if the object is inside any defined region
                    for region in regions:
                        if is_inside_region(region, bbox_center, reg_history, track_id, angle=opt.angle):
                            data.append({
                                'flowId': region.name, 
                                'trackId': track_id,
                                'category': mapped_cls,
                                'createdAt': counter,
                                'time_seconds': current_time
                            })
                            # Increment count for this region in current interval
                            polygon_id = polygon_id_map.get(region.name, region.name)
                            current_interval_counts[polygon_id] += 1

            progress_bar.update(1)
            out.write(_frame)
            past_time = datetime.now().timestamp() - datetime.strptime(current_time, '%Y%m%d_%H%M%S').timestamp()

            # Preview the frame if the option is enabled
            if opt.preview:
                cv2.imshow('frame', _frame)
                if cv2.waitKey(25) & 0xFF == ord('q'):
                    break
    except: logging.exception("Error during video processing.")
    finally:        
        # Save tracking data to CSV with interval information
        df = pd.DataFrame(
            data=data,
            columns=[
                'flowId',
                'trackId',
                'category',
                'createdAt',
                'time_seconds'
            ]
        )
        df.to_csv(opt.csv_path, index=False)
        print(f"\nDetailed detections saved to: {opt.csv_path}")
        
        for region in regions:
            polygon_id = polygon_id_map.get(region.name, region.name)
            count = current_interval_counts[polygon_id]
            interval_data.append({
                'flowId': region.name,
                'polygon_id': polygon_id,
                'count': count,
                'time': current_time,
                'interval_idx': interval_idx + 1
            })                   
        # Save interval summary to separate CSV
        if interval_data:
            interval_csv_path = opt.csv_path.replace('.csv', f'_{opt.interval:.1f}_min_counts.csv')
            df_interval = pd.DataFrame(interval_data)
            df_interval.to_csv(interval_csv_path, index=False)
            print(f"{opt.interval:.1f}-minute interval counts saved to: {interval_csv_path}")
            print("\nInterval Summary:")
            print(df_interval.to_string())

        # Release video capture and writer resources
        progress_bar.close()
        cap.release()
        if out.isOpened():
            out.release()
            print(f"Video file finalized: {output_video_path}")
        cv2.destroyAllWindows()

if __name__ == "__main__":
    # Command-line argument parser
    parser = argparse.ArgumentParser()
    parser.add_argument('--video_path', type=str, required=True, help='Path to the input video or livestream URL (http://, https://, rtsp://)')
    parser.add_argument('--json_path', type=str, required=True, help='Path to the JSON file with region configurations')
    parser.add_argument('--csv_path', type=str, required=True, help='Path to save the output CSV file')
    parser.add_argument('--preview', action='store_true', help='Preview the tracking in a window')
    parser.add_argument('--save_bus', action='store_true', help='saving bus images')
    parser.add_argument('--save_video', action='store_true', help='Save the output video with tracking annotations')
    parser.add_argument('--angle', type=int, default=30, help='Detection angle threshold')
    parser.add_argument('--imgsz', type=int, default=960, help='YOLO image size')
    parser.add_argument('--interval', type=float, default=10, help='Time interval in minutes for counting (default: 10 minutes)')
    opt = parser.parse_args()
    cuda_info()
    execute(opt)