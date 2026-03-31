from collections import defaultdict
import json
import ffmpeg # type: ignore
import numpy as np
import cv2
from ultralytics import YOLO
import torch
import psutil
import os
from tqdm import tqdm
import time
from pynvml import nvmlInit, nvmlDeviceGetHandleByIndex, nvmlDeviceGetMemoryInfo, nvmlDeviceGetUtilizationRates, nvmlShutdown
from shapely.geometry import Polygon, Point

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = YOLO("yolo26s.pt").to(device)

URL = "https://stream.ubtraffic.mn/live/7001.stream_480p/chunklist_w562632275.m3u8"
URL2 = "https://stream.ubtraffic.mn/live/32784.stream_480p/chunklist_w1779054973.m3u8"
URL3 = "https://stream.ubtraffic.mn/live/32786.stream_480p/chunklist_w1146118212.m3u8"

JSON_PATH_1 = "1_zuun4zam_weekday.json"
JSON_PATH_2 = "1_zuun4zam_weekday.json"
JSON_PATH_3 = "1_zuun4zam_weekday.json"

WIDTH = 440
HEIGHT = 360
FPS = 5

reg_history = defaultdict(list)

def read_json(JSON_PATH_1, JSON_PATH_2, JSON_PATH_3):
    with open(JSON_PATH_1, 'r') as file:
        rule1 = json.load(file)
    with open(JSON_PATH_2, 'r') as file:
        rule2 = json.load(file)
    with open(JSON_PATH_3, 'r') as file:
        rule3 = json.load(file)
    return rule1, rule2, rule3

def create_region(width, height):
    from utils import Region
    rule1, rule2, rule3 = read_json(JSON_PATH_1, JSON_PATH_2, JSON_PATH_3)
    polygons1 = rule1['config']['shapes']['Polygon']
    arrows1 = rule1['config']['shapes']['Line']
    polygons2 = rule2['config']['shapes']['Polygon']
    arrows2 = rule2['config']['shapes']['Line']
    polygons3 = rule3['config']['shapes']['Polygon']
    arrows3 = rule3['config']['shapes']['Line']
    # Group regions by rule/camera
    regions = {
        'rule1': [Region(arrow=arrow, polygon=poly, frame_width=width, frame_height=height) for poly, arrow in zip(polygons1, arrows1)],
        'rule2': [Region(arrow=arrow, polygon=poly, frame_width=width, frame_height=height) for poly, arrow in zip(polygons2, arrows2)],
        'rule3': [Region(arrow=arrow, polygon=poly, frame_width=width, frame_height=height) for poly, arrow in zip(polygons3, arrows3)],
    }
    return regions

REGIONS = create_region(width=WIDTH, height=HEIGHT)

def open_ffmpeg_process(url: str, w: int, h: int):
    # Lower analyzeduration/probesize to reduce start-up RAM/time; add reconnect & nobuffer for live
    # Drop 'r=fps' to avoid forced rate conversion; let vsync=drop minimize internal buffering
    return (
        ffmpeg
        .input(url)
        .output(
        'pipe:',
        format='rawvideo',
        pix_fmt='bgr24',
        s='{}x{}'.format(w, h),   # Resize if needed
        r=5
    )
    .run_async(pipe_stdout=True)
    )

def reading_stream(url1, url2, url3, fps=5):
    probe = ffmpeg.probe(url1)
    video_stream = next(stream for stream in probe['streams'] if stream['codec_type'] == 'video')
    width = int(video_stream['width'])
    height = int(video_stream['height'])
    process = open_ffmpeg_process(url1, width, height)
    process2 = open_ffmpeg_process(url2, width, height)
    process3 = open_ffmpeg_process(url3, width, height)
    return process, process2, process3, width, height, fps

def calculate_angle(vector1, vector2):
    dot_product = np.dot(vector1, vector2)
    magnitude1 = np.linalg.norm(vector1)
    magnitude2 = np.linalg.norm(vector2)
    
    # Calculate the angle in radians and convert to degrees
    cosine_angle = dot_product / (magnitude1 * magnitude2)
    angle_radians = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    return np.degrees(angle_radians)

def is_inside_region(region, bbox_center, reg_history, track_id, angle=45):
    if Polygon(region.polygon).contains(Point(bbox_center)):
        reg_history[track_id].append(bbox_center)
        
        # Ensure enough history points exist to calculate movement direction
        if len(reg_history[track_id]) > 3:
            # Calculate the movement direction vector from recent positions
            vec_dir = np.array(reg_history[track_id][-1]) - np.array(reg_history[track_id][-3])
            
            # Check if the movement direction aligns with the region's direction (within 45 degrees)
            #if calculate_angle(region.vec, vec_dir) < angle:
            region.ids.add(track_id)
                
                # If it's a new track ID for this region, mark it
            if track_id not in region.track_ids:
                region.track_ids[track_id] = track_id
                print(f"Track ID {track_id} entered region with direction {region.vec} at position {bbox_center}")
                return True
    return False

def is_inside_region_simple(region, bbox_center, reg_history, track_id):
    if Polygon(region.polygon).contains(Point(bbox_center)):
        reg_history[track_id].append(bbox_center)
        if track_id not in region.track_ids:
            region.track_ids[track_id] = track_id
            print(f"Object {track_id} is inside region with direction {region.vec}")
            return True
    return False

def draw_regions(frame1, frame2, frame3, REGIONS):
    # frame1 <-> rule1, frame2 <-> rule2, frame3 <-> rule3
    for region in REGIONS['rule1']:
        cv2.polylines(frame1, [region.polygon], isClosed=True, color=(0, 255, 0), thickness=2)
    for region in REGIONS['rule2']:
        cv2.polylines(frame2, [region.polygon], isClosed=True, color=(0, 255, 0), thickness=2)
    for region in REGIONS['rule3']:
        cv2.polylines(frame3, [region.polygon], isClosed=True, color=(0, 255, 0), thickness=2)

def counting_regions(results1, results2, results3, REGIONS, region_counts, frame=None, frame2=None, frame3=None):
    # Ensure results are always lists
    all_results = [results1, results2, results3]
    rule_keys = ['rule1', 'rule2', 'rule3']
    offset = 0
    for i, result_set in enumerate(all_results):
        # If result_set is a list, use the first element
        result = result_set[0] if isinstance(result_set, list) else result_set
        if not hasattr(result, "boxes") or result.boxes is None:
            continue
        boxes = result.boxes.xyxy.cpu()
        # Handle NoneType for id and cls
        if result.boxes.id is None or result.boxes.cls is None:
            continue
        track_ids = result.boxes.id.int().cpu().tolist() if hasattr(result.boxes.id, 'cpu') else list(result.boxes.id)
        classes = result.boxes.cls.cpu().tolist() if hasattr(result.boxes.cls, 'cpu') else list(result.boxes.cls)
        regions = REGIONS[rule_keys[i]]
        for box, track_id, cls in zip(boxes, track_ids, classes):
            if cls in [2, 3, 5, 7]:
                bbox_center = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
                for idx, region in enumerate(regions):
                    if is_inside_region_simple(region, bbox_center, reg_history, track_id):
                        region_counts[offset + idx] += 1
                        # Draw bounding box if the object is in the region
                        x1, y1, x2, y2 = map(int, box)
                        cv2.rectangle(
                            frame if i == 0 else frame2 if i == 1 else frame3,
                            (x1, y1), (x2, y2),
                            (0, 0, 255), 2
                        )
                        cv2.putText(
                            frame if i == 0 else frame2 if i == 1 else frame3,
                            f'ID:{track_id}',
                            (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2
                        )
        offset += len(regions)
    return region_counts, frame, frame2, frame3

def drawing_on_display(frame, regions, region_counts):
    # regions: list of Region objects for this frame, region_counts: list of counts for these regions
    for idx, region in enumerate(regions):
        pts = np.array(region.polygon, np.int32)
        centroid = np.mean(pts, axis=0).astype(int)
        cv2.putText(frame, f'{region_counts[idx]}', (centroid[0], centroid[1]),
            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2, cv2.LINE_AA)
    return frame

def display_frame(frame, window_name='Frame'):
    cv2.imshow(window_name, frame)
    if cv2.waitKey(int(1000 / FPS)) == 27:   # ESC to quit
        return False
    return True

def stopping_processes(process, process2, process3):
    process.stdout.close()
    process.wait()
    process2.stdout.close()
    process2.wait()
    process3.stdout.close()
    process3.wait()
    cv2.destroyAllWindows()
    
def detect(process, process2, process3, frame_size, width, height, fps, region_counts, display=True):
  # bgr24: 3 bytes per pixel
    frame_count = 0
    start_time = time.time()
    # GPU monitoring setup
    gpu_available = False
    try:
        nvmlInit()
        handle = nvmlDeviceGetHandleByIndex(0)
        gpu_available = True
    except Exception:
        gpu_available = False
    progress_bar = tqdm(total=None, desc='Resource Monitor', dynamic_ncols=True, position=0, leave=True, bar_format='{l_bar}{bar}| {elapsed}  {postfix}')
    region_bar = tqdm(total=0, desc='Region Detections', dynamic_ncols=True, position=1, leave=True, bar_format='{l_bar}{bar}| {postfix}')
    
    while True:
        raw_frame = process.stdout.read(frame_size)
        raw_frame2 = process2.stdout.read(frame_size)
        raw_frame3 = process3.stdout.read(frame_size)
        if len(raw_frame) < frame_size or len(raw_frame2) < frame_size or len(raw_frame3) < frame_size:
            print("End of stream or error. Waiting 5 seconds and trying to reconnect...")
            stopping_processes(process, process2, process3)
            time.sleep(5)
            try:
                process, process2, process3, width, height, fps = reading_stream(URL, URL2, URL3, fps)
                frame_size = width * height * 3
                continue
            except Exception as e:
                print(f"Reconnection failed: {e}. Retrying in 5 seconds...")
                time.sleep(5)
                continue

        frame = np.frombuffer(raw_frame, np.uint8).reshape((height, width, 3)).copy()  # OpenCV format
        frame2 = np.frombuffer(raw_frame2, np.uint8).reshape((height, width, 3)).copy()  # OpenCV format
        frame3 = np.frombuffer(raw_frame3, np.uint8).reshape((height, width, 3)).copy()  # OpenCV format

        # Elapsed/resource bar
        elapsed = time.time() - start_time
        elapsed_str = time.strftime('%H:%M:%S', time.gmtime(elapsed))
        process_info = psutil.Process(os.getpid())
        mem_mb = process_info.memory_info().rss / 1024 ** 2
        cpu_percent = process_info.cpu_percent(interval=0.01)
        postfix = f'Elapsed: {elapsed_str} | Frame: {frame_count} | RAM: {mem_mb:.1f}MB | CPU: {cpu_percent:.1f}%'
        if gpu_available:
            try:
                gpu_mem = nvmlDeviceGetMemoryInfo(handle)
                gpu_util = nvmlDeviceGetUtilizationRates(handle)
                postfix += f' | GPU: {gpu_util.gpu}% | GPU Mem: {gpu_mem.used/1024/1024:.1f}MB'
            except Exception:
                postfix += ' | GPU: N/A'
        progress_bar.set_postfix_str(postfix)
        progress_bar.update(1)
        frame_count += 1

        # Region detection bar
        region_counts_str = " | ".join([f"Region {i}: {count}" for i, count in enumerate(region_counts)])
        region_bar.set_postfix_str(region_counts_str)
        region_bar.n = sum(region_counts)
        region_bar.refresh()

        # Run YOLO detection and ByteTrack tracking on each frame
        results1 = model.track(frame, persist=True, conf=0.3, iou=0.3, tracker="bytetrack.yaml", verbose=False, device=0)
        results2 = model.track(frame2, persist=True, conf=0.3, iou=0.3, tracker="bytetrack.yaml", verbose=False, device=0)
        results3 = model.track(frame3, persist=True, conf=0.3, iou=0.3, tracker="bytetrack.yaml", verbose=False, device=0)

        region_counts = counting_regions(results1, results2, results3, REGIONS, region_counts)

        if display:
            frame = frame.copy()
            frame2 = frame2.copy()
            frame3 = frame3.copy()
            draw_regions(frame, frame2, frame3, REGIONS)
            # Split region_counts for each rule
            n1 = len(REGIONS['rule1'])
            n2 = len(REGIONS['rule2'])
            n3 = len(REGIONS['rule3'])
            frame = drawing_on_display(frame, REGIONS['rule1'], region_counts[:n1])
            frame2 = drawing_on_display(frame2, REGIONS['rule2'], region_counts[n1:n1+n2])
            frame3 = drawing_on_display(frame3, REGIONS['rule3'], region_counts[n1+n2:])
            cv2.imshow('YOLO Only Stream 1', frame)
            cv2.imshow('YOLO Only Stream 2', frame2)
            cv2.imshow('YOLO Only Stream 3', frame3)

            if cv2.waitKey(int(1000 / fps)) == 27:   # ESC to quit
                break

    stopping_processes(process, process2, process3)
    cv2.destroyAllWindows()
    progress_bar.close()
    region_bar.close()
    if gpu_available:
        nvmlShutdown()

def yolo_only(process, process2, process3, frame_size, width, height, fps, display=True):
    region_counts = [0 for _ in REGIONS['rule1']] + [0 for _ in REGIONS['rule2']] + [0 for _ in REGIONS['rule3']]
    try:
        nvmlInit()
        handle = nvmlDeviceGetHandleByIndex(0)
        gpu_available = True
    except Exception:
        gpu_available = False
    progress_bar = tqdm(total=None, desc='Resource Monitor', dynamic_ncols=True, position=0, leave=True, bar_format='{l_bar}{bar}| {elapsed}  {postfix}')
    start_time = time.time()
    frame_count = 0
    while True:
        raw_frame = process.stdout.read(frame_size)
        raw_frame2 = process2.stdout.read(frame_size)
        raw_frame3 = process3.stdout.read(frame_size)

        frame = np.frombuffer(raw_frame, np.uint8).reshape((height, width, 3)).copy()  # OpenCV format, writable
        frame2 = np.frombuffer(raw_frame2, np.uint8).reshape((height, width, 3)).copy()  # OpenCV format, writable
        frame3 = np.frombuffer(raw_frame3, np.uint8).reshape((height, width, 3)).copy()  # OpenCV format, writable

        # Elapsed/resource bar
        elapsed = time.time() - start_time
        elapsed_str = time.strftime('%H:%M:%S', time.gmtime(elapsed))
        process_info = psutil.Process(os.getpid())
        mem_mb = process_info.memory_info().rss / 1024 ** 2
        cpu_percent = process_info.cpu_percent(interval=0.01)
        postfix = f'Elapsed: {elapsed_str} | Frame: {frame_count} | RAM: {mem_mb:.1f}MB | CPU: {cpu_percent:.1f}%'
        if gpu_available:
            try:
                gpu_mem = nvmlDeviceGetMemoryInfo(handle)
                gpu_util = nvmlDeviceGetUtilizationRates(handle)
                postfix += f' | GPU: {gpu_util.gpu}% | GPU Mem: {gpu_mem.used/1024/1024:.1f}MB'
            except Exception:
                postfix += ' | GPU: N/A'
        progress_bar.set_postfix_str(postfix)
        progress_bar.update(1)
        frame_count += 1

        results1 = model.track(frame, persist=True, conf=0.2, iou=0.3, tracker="bytetrack.yaml", verbose=False, device=0)
        results2 = model.track(frame2, persist=True, conf=0.2, iou=0.3, tracker="bytetrack.yaml", verbose=False, device=0)
        results3 = model.track(frame3, persist=True, conf=0.2, iou=0.3, tracker="bytetrack.yaml", verbose=False, device=0)
        
        draw_regions(frame, frame2, frame3, REGIONS)

        region_counts, frame, frame2, frame3 = counting_regions(results1, results2, results3, REGIONS, region_counts, frame, frame2, frame3)

        drawing_on_display(frame, REGIONS['rule1'], region_counts[:len(REGIONS['rule1'])])
        drawing_on_display(frame2, REGIONS['rule2'], region_counts[len(REGIONS['rule1']):len(REGIONS['rule1'])+len(REGIONS['rule2'])])
        drawing_on_display(frame3, REGIONS['rule3'], region_counts[len(REGIONS['rule1'])+len(REGIONS['rule2']):])
        if display:
            cv2.imshow('YOLO Only Stream 1', frame)
            cv2.imshow('YOLO Only Stream 2', frame2)
            cv2.imshow('YOLO Only Stream 3', frame3)

            if cv2.waitKey(int(1000 / fps)) == 27:   # ESC to quit
                break
        else:
            if frame_count > 10000000:  # Example: break after 1000 frames
                break
        
    stopping_processes(process, process2, process3)
    cv2.destroyAllWindows()
    progress_bar.close()
    if gpu_available:
        nvmlShutdown()

def main():
    
    print("Starting stream reading and detection...")
    process, process2, process3, width, height, fps = reading_stream(URL, URL2, URL3, fps=5)
    
    yolo_only(process, process2, process3, width * height * 3, width, height, fps, display=True)
    # print("Stream reading initialized.")
    # region_counts = [0 for _ in REGIONS['rule1']] + [0 for _ in REGIONS['rule2']] + [0 for _ in REGIONS['rule3']]

    # print("Stream reading started.")
    # frame_size = width * height * 3

    # print("Beginning detection and display...")
    # detect(process, process2, process3, frame_size, width, height, fps, region_counts, display=False)

if __name__ == "__main__":
    main()