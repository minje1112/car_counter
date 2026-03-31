#!/usr/bin/env python3
"""
Multi-Stream Car Counter Worker (sstart.py)

Processes multiple RTSP/HLS streams in a single process using one shared YOLO
model and ByteTrack tracker. Designed to save RAM compared to spawning separate
worker processes per stream.

Modes of operation:
  1. Database mode (default): Fetches active streams and their annotation rules
     from MySQL automatically.
  2. CLI mode: Pass stream URLs and optional JSON rule files via arguments.

Usage examples:
  # Database mode – processes all active streams from the DB:
  python sstart.py

  # Database mode with options:
  python sstart.py --headless --save-interval 30 --model yolov8s.pt

  # CLI mode – explicit URLs (no DB needed):
  python sstart.py --urls "rtsp://cam1" "rtsp://cam2" --rules rule1.json rule2.json
"""

from collections import defaultdict
import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime

import ffmpeg  # type: ignore
import numpy as np
import cv2
from ultralytics import YOLO
import torch
import psutil
from tqdm import tqdm
from shapely.geometry import Polygon, Point

# Optional GPU monitoring
try:
    from pynvml import (
        nvmlInit, nvmlDeviceGetHandleByIndex,
        nvmlDeviceGetMemoryInfo, nvmlDeviceGetUtilizationRates, nvmlShutdown,
    )
    _HAS_NVML = True
except ImportError:
    _HAS_NVML = False

# Database connector
try:
    import mysql.connector
    from dotenv import load_dotenv
    _HAS_DB = True
except ImportError:
    _HAS_DB = False

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger('sstart')

# ---------------------------------------------------------------------------
# Region helper (reuses utils.py Region class)
# ---------------------------------------------------------------------------
# Ensure the workers directory is on the path so ``from utils import Region``
# works regardless of the current working directory.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from utils import Region  # noqa: E402

# Vehicle COCO class IDs: car, motorcycle, bus, truck
VEHICLE_CLASSES = [2, 3, 5, 7]

# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------
def _get_db_config():
    """Return MySQL connection kwargs from environment variables."""
    if _HAS_DB:
        load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
    return {
        'host': os.getenv('DB_HOST', 'localhost'),
        'user': os.getenv('DB_USER', 'root'),
        'password': os.getenv('DB_PASSWORD', ''),
        'database': os.getenv('DB_NAME', 'car_counter_db'),
        'port': int(os.getenv('DB_PORT', '3306')),
    }


def fetch_active_streams():
    """Fetch all streams with ai_status='active' and their annotation rules."""
    if not _HAS_DB:
        logger.error('mysql-connector-python / python-dotenv not installed; cannot use DB mode.')
        return []
    cfg = _get_db_config()
    conn = mysql.connector.connect(**cfg)
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT s.id, s.name, s.rtsp_url, s.ai_interval,
               a.annotations AS annotation_rules
        FROM rtsp_streams s
        LEFT JOIN annotations a ON s.annotation_id = a.id
        WHERE s.ai_status = 'active'
        ORDER BY s.id
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows


def save_counts_to_db(stream_id, region_name, count, interval_idx):
    """Insert a row into ai_car_counts."""
    if not _HAS_DB:
        return
    cfg = _get_db_config()
    conn = mysql.connector.connect(**cfg)
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO ai_car_counts (stream_id, flowId, polygon_id, count, time, interval_idx)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (stream_id, f'flow-{stream_id}', region_name, count, datetime.now(), interval_idx),
    )
    conn.commit()
    cursor.close()
    conn.close()


def update_stream_last_count(stream_id, total_count):
    """Update rtsp_streams.last_ai_count and last_ai_check."""
    if not _HAS_DB:
        return
    cfg = _get_db_config()
    conn = mysql.connector.connect(**cfg)
    cursor = conn.cursor()
    cursor.execute(
        'UPDATE rtsp_streams SET last_ai_count = %s, last_ai_check = NOW() WHERE id = %s',
        (total_count, stream_id),
    )
    conn.commit()
    cursor.close()
    conn.close()


# ---------------------------------------------------------------------------
# Stream & Region helpers
# ---------------------------------------------------------------------------
def build_regions_from_rules(rules, width, height):
    """Parse annotation rules JSON and return a list of Region objects."""
    if not rules:
        return []
    if isinstance(rules, str):
        rules = json.loads(rules)
    # Support both the annotation editor format (config.shapes) and flat list
    shapes = rules.get('config', rules).get('shapes', rules)
    polygons = shapes.get('Polygon', [])
    arrows = shapes.get('Line', [])
    regions = []
    for poly, arrow in zip(polygons, arrows):
        regions.append(Region(arrow=arrow, polygon=poly, frame_width=width, frame_height=height))
    return regions


def open_ffmpeg_process(url, w, h, fps=5):
    """Open an FFmpeg subprocess that outputs raw BGR24 frames."""
    return (
        ffmpeg
        .input(url)
        .output(
            'pipe:',
            format='rawvideo',
            pix_fmt='bgr24',
            s=f'{w}x{h}',
            r=fps,
        )
        .run_async(pipe_stdout=True)
    )


def probe_stream(url):
    """Probe stream to get width/height."""
    probe = ffmpeg.probe(url)
    video = next(s for s in probe['streams'] if s['codec_type'] == 'video')
    return int(video['width']), int(video['height'])


# ---------------------------------------------------------------------------
# Core detection helpers
# ---------------------------------------------------------------------------
reg_history = defaultdict(list)


def is_inside_region_simple(region, bbox_center, track_id):
    """Check if center point is inside region polygon (no angle check)."""
    if Polygon(region.polygon).contains(Point(bbox_center)):
        reg_history[track_id].append(bbox_center)
        if track_id not in region.track_ids:
            region.track_ids[track_id] = track_id
            return True
    return False


def count_detections(results_list, regions_per_stream, region_counts, frames=None):
    """Count vehicles across all streams and their regions."""
    offset = 0
    for i, result_set in enumerate(results_list):
        result = result_set[0] if isinstance(result_set, list) else result_set
        if not hasattr(result, 'boxes') or result.boxes is None:
            offset += len(regions_per_stream[i])
            continue
        boxes = result.boxes.xyxy.cpu()
        if result.boxes.id is None or result.boxes.cls is None:
            offset += len(regions_per_stream[i])
            continue
        track_ids = result.boxes.id.int().cpu().tolist()
        classes = result.boxes.cls.cpu().tolist()
        regions = regions_per_stream[i]
        for box, tid, cls in zip(boxes, track_ids, classes):
            if cls in VEHICLE_CLASSES:
                cx = float((box[0] + box[2]) / 2)
                cy = float((box[1] + box[3]) / 2)
                for idx, region in enumerate(regions):
                    if is_inside_region_simple(region, (cx, cy), tid):
                        region_counts[offset + idx] += 1
                        if frames is not None:
                            x1, y1, x2, y2 = map(int, box)
                            cv2.rectangle(frames[i], (x1, y1), (x2, y2), (0, 0, 255), 2)
                            cv2.putText(frames[i], f'ID:{tid}', (x1, y1 - 10),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
        offset += len(regions)
    return region_counts


def draw_all_regions(frames, regions_per_stream):
    """Draw polygon outlines on all frames."""
    for i, regions in enumerate(regions_per_stream):
        for region in regions:
            cv2.polylines(frames[i], [region.polygon], True, (0, 255, 0), 2)


def draw_counts_on_frame(frame, regions, counts_slice):
    """Overlay count text on each region centroid."""
    for idx, region in enumerate(regions):
        pts = np.array(region.polygon, np.int32)
        centroid = np.mean(pts, axis=0).astype(int)
        cv2.putText(frame, str(counts_slice[idx]), (centroid[0], centroid[1]),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2, cv2.LINE_AA)


# ---------------------------------------------------------------------------
# Main processing loop
# ---------------------------------------------------------------------------
def run(streams, model_path='yolov8s.pt', width=440, height=360, fps=5,
        display=True, save_interval=60, conf=0.3, iou=0.3):
    """
    Main processing loop for all streams.

    Parameters
    ----------
    streams : list[dict]
        Each dict must have: id, name, rtsp_url, annotation_rules (str/dict or None).
    model_path : str
        Path to the YOLO weights file.
    width, height : int
        Resolution to resize frames to.
    fps : int
        Target FPS for FFmpeg extraction.
    display : bool
        Whether to show OpenCV windows (set False for headless servers).
    save_interval : int
        Seconds between periodic DB saves.
    conf, iou : float
        YOLO confidence and IoU thresholds.
    """
    if not streams:
        logger.error('No streams to process. Exiting.')
        return

    logger.info(f'Loading YOLO model: {model_path}')
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = YOLO(model_path).to(device)
    yolo_device = 0 if torch.cuda.is_available() else 'cpu'

    # Build regions and open FFmpeg processes for each stream
    processes = []
    regions_per_stream = []
    stream_ids = []
    stream_names = []
    for s in streams:
        sid = s.get('id', 0)
        url = s['rtsp_url']
        rules = s.get('annotation_rules')
        stream_ids.append(sid)
        stream_names.append(s.get('name', f'stream-{sid}'))

        regions = build_regions_from_rules(rules, width, height)
        regions_per_stream.append(regions)

        logger.info(f'Opening stream {sid} ({s.get("name", "?")}): {url}  '
                     f'[{len(regions)} regions]')
        proc = open_ffmpeg_process(url, width, height, fps)
        processes.append(proc)

    total_regions = sum(len(r) for r in regions_per_stream)
    region_counts = [0] * total_regions
    frame_size = width * height * 3
    frame_count = 0
    last_save_time = time.time()
    interval_idx = 0

    # GPU monitoring
    gpu_available = False
    gpu_handle = None
    if _HAS_NVML:
        try:
            nvmlInit()
            gpu_handle = nvmlDeviceGetHandleByIndex(0)
            gpu_available = True
        except Exception:
            pass

    progress_bar = tqdm(total=None, desc='Resource Monitor', dynamic_ncols=True,
                        position=0, leave=True,
                        bar_format='{l_bar}{bar}| {elapsed}  {postfix}')
    region_bar = tqdm(total=0, desc='Region Detections', dynamic_ncols=True,
                      position=1, leave=True,
                      bar_format='{l_bar}{bar}| {postfix}')
    start_time = time.time()

    logger.info(f'Starting detection loop for {len(streams)} stream(s), '
                f'save_interval={save_interval}s, display={display}')

    try:
        while True:
            # Read frames from all streams
            frames = []
            all_ok = True
            for proc in processes:
                raw = proc.stdout.read(frame_size)
                if len(raw) < frame_size:
                    all_ok = False
                    break
                frame = np.frombuffer(raw, np.uint8).reshape((height, width, 3)).copy()
                frames.append(frame)

            if not all_ok:
                logger.warning('Stream read failure. Reconnecting in 5s...')
                for p in processes:
                    try:
                        p.stdout.close()
                        p.wait()
                    except Exception:
                        pass
                time.sleep(5)
                processes = []
                for s in streams:
                    try:
                        proc = open_ffmpeg_process(s['rtsp_url'], width, height, fps)
                        processes.append(proc)
                    except Exception as e:
                        logger.error(f'Reconnect failed for stream {s.get("id")}: {e}')
                        processes.append(None)
                if any(p is None for p in processes):
                    logger.error('Could not reconnect all streams. Retrying...')
                    time.sleep(5)
                continue

            # Resource monitoring
            elapsed = time.time() - start_time
            elapsed_str = time.strftime('%H:%M:%S', time.gmtime(elapsed))
            proc_info = psutil.Process(os.getpid())
            mem_mb = proc_info.memory_info().rss / 1024 ** 2
            cpu_pct = proc_info.cpu_percent(interval=0.01)
            postfix = (f'Elapsed: {elapsed_str} | Frame: {frame_count} | '
                       f'RAM: {mem_mb:.1f}MB | CPU: {cpu_pct:.1f}%')
            if gpu_available and gpu_handle is not None:
                try:
                    gm = nvmlDeviceGetMemoryInfo(gpu_handle)
                    gu = nvmlDeviceGetUtilizationRates(gpu_handle)
                    postfix += f' | GPU: {gu.gpu}% | GPU Mem: {gm.used / 1024 / 1024:.1f}MB'
                except Exception:
                    postfix += ' | GPU: N/A'
            progress_bar.set_postfix_str(postfix)
            progress_bar.update(1)
            frame_count += 1

            # Run YOLO + ByteTrack on each frame
            results_list = []
            for f in frames:
                res = model.track(f, persist=True, conf=conf, iou=iou,
                                  tracker='bytetrack.yaml', verbose=False,
                                  device=yolo_device)
                results_list.append(res)

            # Count vehicles in regions
            region_counts = count_detections(
                results_list, regions_per_stream, region_counts,
                frames=frames if display else None,
            )

            # Region bar
            parts = []
            offset = 0
            for i, regions in enumerate(regions_per_stream):
                for idx, region in enumerate(regions):
                    parts.append(f'S{stream_ids[i]}-{region.name}: {region_counts[offset + idx]}')
                offset += len(regions)
            region_bar.set_postfix_str(' | '.join(parts))
            region_bar.n = sum(region_counts)
            region_bar.refresh()

            # Display (if not headless)
            if display:
                draw_all_regions(frames, regions_per_stream)
                offset = 0
                for i, regions in enumerate(regions_per_stream):
                    n = len(regions)
                    draw_counts_on_frame(frames[i], regions, region_counts[offset:offset + n])
                    cv2.imshow(f'Stream {stream_ids[i]}: {stream_names[i]}', frames[i])
                    offset += n
                if cv2.waitKey(int(1000 / fps)) == 27:
                    logger.info('ESC pressed – exiting.')
                    break

            # Periodic database save
            now = time.time()
            if now - last_save_time >= save_interval:
                offset = 0
                for i, regions in enumerate(regions_per_stream):
                    total_for_stream = 0
                    for idx, region in enumerate(regions):
                        cnt = region_counts[offset + idx]
                        total_for_stream += cnt
                        try:
                            save_counts_to_db(stream_ids[i], region.name, cnt, interval_idx)
                        except Exception as e:
                            logger.error(f'DB save error stream {stream_ids[i]}: {e}')
                    try:
                        update_stream_last_count(stream_ids[i], total_for_stream)
                    except Exception as e:
                        logger.error(f'DB update error stream {stream_ids[i]}: {e}')
                    offset += len(regions)
                interval_idx += 1
                last_save_time = now
                logger.info(f'Saved counts to DB (interval {interval_idx}): {region_counts}')

    except KeyboardInterrupt:
        logger.info('Interrupted by user.')
    finally:
        for p in processes:
            try:
                p.stdout.close()
                p.wait()
            except Exception:
                pass
        if display:
            cv2.destroyAllWindows()
        progress_bar.close()
        region_bar.close()
        if gpu_available and _HAS_NVML:
            try:
                nvmlShutdown()
            except Exception:
                pass
    logger.info('Worker stopped.')


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def parse_args():
    parser = argparse.ArgumentParser(
        description='Multi-stream car counter worker. '
                    'By default, fetches active streams from the database.',
    )
    parser.add_argument('--urls', nargs='+', default=None,
                        help='Stream URLs (CLI mode). If omitted, streams are '
                             'fetched from the database.')
    parser.add_argument('--rules', nargs='+', default=None,
                        help='JSON annotation rule files, one per URL (CLI mode).')
    parser.add_argument('--model', default='yolov8s.pt',
                        help='YOLO model path (default: yolov8s.pt)')
    parser.add_argument('--width', type=int, default=440)
    parser.add_argument('--height', type=int, default=360)
    parser.add_argument('--fps', type=int, default=5)
    parser.add_argument('--conf', type=float, default=0.3,
                        help='YOLO confidence threshold')
    parser.add_argument('--iou', type=float, default=0.3,
                        help='YOLO IoU threshold for NMS')
    parser.add_argument('--headless', action='store_true',
                        help='Run without display (for servers)')
    parser.add_argument('--save-interval', type=int, default=60,
                        help='Seconds between DB saves (default: 60)')
    # Legacy argparse args used when called from ai.worker.js
    parser.add_argument('--video_path', default=None, help=argparse.SUPPRESS)
    parser.add_argument('--stream_id', default=None, help=argparse.SUPPRESS)
    parser.add_argument('--csv_path', default=None, help=argparse.SUPPRESS)
    parser.add_argument('--json_path', default=None, help=argparse.SUPPRESS)
    return parser.parse_args()


def main():
    args = parse_args()

    # Legacy mode: called from ai.worker.js with --video_path / --stream_id
    if args.video_path and args.stream_id:
        logger.info(f'Legacy mode: processing single stream {args.stream_id}')
        rules = None
        if args.json_path and os.path.exists(args.json_path):
            with open(args.json_path, 'r') as f:
                rules = json.load(f)
        streams = [{
            'id': int(args.stream_id),
            'name': f'stream-{args.stream_id}',
            'rtsp_url': args.video_path,
            'annotation_rules': rules,
        }]
        run(streams, model_path=args.model,
            width=args.width, height=args.height, fps=args.fps,
            display=not args.headless, save_interval=args.save_interval,
            conf=args.conf, iou=args.iou)
        return

    # CLI mode: explicit URLs
    if args.urls:
        streams = []
        for i, url in enumerate(args.urls):
            rules = None
            if args.rules and i < len(args.rules):
                with open(args.rules[i], 'r') as f:
                    rules = json.load(f)
            streams.append({
                'id': i + 1,
                'name': f'stream-{i + 1}',
                'rtsp_url': url,
                'annotation_rules': rules,
            })
        run(streams, model_path=args.model,
            width=args.width, height=args.height, fps=args.fps,
            display=not args.headless, save_interval=args.save_interval,
            conf=args.conf, iou=args.iou)
        return

    # Database mode (default): fetch active streams
    logger.info('Database mode: fetching active streams...')
    rows = fetch_active_streams()
    if not rows:
        logger.error('No active streams found in database. '
                     'Add streams via the web UI or API and set ai_status to "active".')
        sys.exit(1)

    streams = []
    for row in rows:
        streams.append({
            'id': row['id'],
            'name': row['name'],
            'rtsp_url': row['rtsp_url'],
            'annotation_rules': row.get('annotation_rules'),
        })
    logger.info(f'Found {len(streams)} active stream(s): '
                f'{[s["name"] for s in streams]}')

    run(streams, model_path=args.model,
        width=args.width, height=args.height, fps=args.fps,
        display=not args.headless, save_interval=args.save_interval,
        conf=args.conf, iou=args.iou)


if __name__ == '__main__':
    main()