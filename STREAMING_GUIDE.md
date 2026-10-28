# Streaming Guide – Adding Video Streams & Counting Cars

This guide explains how to add RTSP/HLS video streaming links to the car counter
system, and how to run the AI worker to count vehicles.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Adding Streams via the Web UI](#adding-streams-via-the-web-ui)
3. [Adding Streams via the API](#adding-streams-via-the-api)
4. [Running the AI Worker](#running-the-ai-worker)
5. [Architecture Overview](#architecture-overview)

---

## Prerequisites

| Requirement | Minimum Version |
|---|---|
| **Node.js** | ≥ 20.9.0 |
| **Python** | ≥ 3.9 |
| **MySQL** | ≥ 8.0 |
| **Redis** | ≥ 6.0 |
| **FFmpeg** | ≥ 5.0 (must be on PATH) |

Install Python dependencies:

```bash
cd backend/workers
pip install -r requirements.txt
```

Set up the `.env` file in `backend/`:

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your MySQL password, Redis host, etc.
```

---

## Adding Streams via the Web UI

### Step 1: Register & Log In

1. Open the frontend at `http://localhost:3001`
2. Register a new account or log in with existing credentials.

### Step 2: Add a Camera (Stream)

1. On the main dashboard, locate the right-hand **Camera Info Panel**.
2. Click the **⋮ menu** → **Add Camera**.
3. Fill in the form:

   | Field | Required | Description | Example |
   |---|---|---|---|
   | **Name** | ✅ | A friendly name | `Zuun 4 Zam - Cam 1` |
   | **RTSP URL** | ✅ | The stream URL (RTSP, HLS, or HTTP) | `rtsp://192.168.1.100:554/stream1` |
   | **Location** | No | Physical location | `Intersection A` |
   | **Description** | No | Notes | `480p weekday traffic feed` |

4. Click **Save**. The camera appears in the list with status `inactive`.

### Step 3: Create Counting Zones (Annotations)

1. Select the camera and click **⋮ menu** → **Edit Zone**.
2. This opens the **annotation editor** (`/editor` page).
3. Draw **polygons** on the video frame to define counting regions.
4. Draw **arrows** (lines) to indicate the expected traffic direction.
5. **Save** the annotation.

### Step 4: Assign Counting Zone to Camera

1. Back on the dashboard, select the camera.
2. In the **Zone** dropdown, pick the annotation you created.
3. The system links the counting rules to the stream.

### Step 5: Start AI Counting

1. In the Camera Info Panel, click the **▶ Play** button to start AI counting.
2. Set the counting interval (default: 60 seconds) – this is how often the BullMQ
   queue worker captures and analyzes a frame.
3. The AI status indicator turns **green** when active.

### Step 6: View Results

- **Real-time**: The AI Count panel shows current count, average, peak, and trend.
- **Historical**: Use the statistics panel or query the API for date-range reports.

---

## Adding Streams via the API

You can also manage streams programmatically. All endpoints require a JWT token
in the `Authorization: Bearer <token>` header.

### Authenticate

```bash
# Register (first time)
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Admin","email":"admin@example.com","password":"secret123","organizationName":"My Org"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"secret123"}'
# → Copy the token from the response
```

### Add a Stream

```bash
TOKEN="your-jwt-token"

curl -X POST http://localhost:3000/api/rtsp/streams \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Zuun 4 Zam - Cam 1",
    "rtspUrl": "https://stream.ubtraffic.mn/live/7001.stream_480p/chunklist.m3u8",
    "location": "Zuun 4 Zam intersection",
    "description": "480p weekday traffic"
  }'
```

### Add Multiple Streams

```bash
# Stream 2
curl -X POST http://localhost:3000/api/rtsp/streams \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Zuun 4 Zam - Cam 2",
    "rtspUrl": "https://stream.ubtraffic.mn/live/32784.stream_480p/chunklist.m3u8",
    "location": "Zuun 4 Zam east"
  }'

# Stream 3
curl -X POST http://localhost:3000/api/rtsp/streams \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Zuun 4 Zam - Cam 3",
    "rtspUrl": "https://stream.ubtraffic.mn/live/32786.stream_480p/chunklist.m3u8",
    "location": "Zuun 4 Zam west"
  }'
```

### Assign Annotation & Start Counting

```bash
# Assign counting zone (annotation ID 1) to stream ID 1
curl -X PUT http://localhost:3000/api/rtsp/streams/1/annotation \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"annotationId": 1}'

# Start AI counting (every 60 seconds)
curl -X POST http://localhost:3000/api/ai/streams/1/start \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"interval": 60}'
```

### List All Streams

```bash
curl http://localhost:3000/api/rtsp/streams \
  -H "Authorization: Bearer $TOKEN"
```

Full API documentation is available at `http://localhost:3000/api-docs` (Swagger).

---

## Running the AI Worker

There are **two worker modes** depending on your needs:

### Option A: Multi-Stream Worker (`sstart.py`) – Recommended

Runs a **single Python process** that handles all active streams at once.
This is the most RAM-efficient approach because the YOLO model and ByteTrack
tracker are loaded only once and shared across all streams.

```bash
# Default: fetches active streams from the database
cd backend
python workers/sstart.py --headless

# Or via npm:
npm run start:sstart

# With custom options:
python workers/sstart.py \
  --headless \
  --model yolov8s.pt \
  --save-interval 30 \
  --width 640 --height 480 \
  --fps 5 \
  --conf 0.3

# CLI mode (no database needed):
python workers/sstart.py \
  --urls "rtsp://cam1/stream" "rtsp://cam2/stream" "rtsp://cam3/stream" \
  --rules rules1.json rules2.json rules3.json \
  --headless
```

**Key flags:**

| Flag | Default | Description |
|---|---|---|
| `--headless` | off | Run without GUI display (for servers) |
| `--model` | `yolov8s.pt` | Path to YOLO model weights |
| `--save-interval` | `60` | Seconds between database saves |
| `--width` | `440` | Frame width |
| `--height` | `360` | Frame height |
| `--fps` | `5` | Target frames per second |
| `--conf` | `0.3` | YOLO confidence threshold |
| `--iou` | `0.3` | YOLO NMS IoU threshold |
| `--urls` | (none) | CLI mode: explicit stream URLs |
| `--rules` | (none) | CLI mode: JSON annotation files per URL |

**How it works:**
1. Fetches all streams with `ai_status='active'` from MySQL.
2. Opens FFmpeg sub-processes to decode each stream.
3. Runs YOLO + ByteTrack on every frame for all streams.
4. Counts vehicles entering annotated polygon regions.
5. Saves counts to `ai_car_counts` table every `--save-interval` seconds.
6. Updates `rtsp_streams.last_ai_count` and `last_ai_check`.

### Option B: Queue-Based Worker (`ai.worker.js`) – Per-Frame Snapshots

Uses BullMQ + Redis to process one frame per stream at scheduled intervals.
Each job spawns a Python process (`car_counter_worker.py`) to capture and
analyze a single frame.

```bash
# Start the Node.js queue worker
npm run start:worker

# Or as part of the full stack:
npm run dev
```

**When to use which:**

| | `sstart.py` (Option A) | `ai.worker.js` (Option B) |
|---|---|---|
| **RAM usage** | Low – one model in memory | Higher – spawns Python per job |
| **Tracking** | ByteTrack across frames | Single-frame detection only |
| **Accuracy** | Higher (movement tracking) | Lower (snapshot only) |
| **Scalability** | Limited by GPU memory | Scales via Redis workers |
| **Use case** | ≤ 5 streams on one GPU | Many streams across machines |

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│                Frontend (Next.js :3001)      │
│  ┌────────┐  ┌──────────┐  ┌─────────────┐  │
│  │Add Cam │  │ Assign   │  │ AI Count    │  │
│  │ Modal  │  │ Zone     │  │ Display     │  │
│  └───┬────┘  └────┬─────┘  └──────┬──────┘  │
│      │            │               │ Socket.IO│
└──────┼────────────┼───────────────┼──────────┘
       │ REST API   │ REST API      │
┌──────┼────────────┼───────────────┼──────────┐
│      ▼            ▼               │          │
│  ┌────────────────────────────┐   │ Backend  │
│  │   Express API (:3000)      │◄──┘          │
│  │  /api/rtsp/streams  (CRUD) │              │
│  │  /api/ai/streams    (jobs) │              │
│  └──────────┬─────────────────┘              │
│             │                                │
│  ┌──────────▼─────────────────┐              │
│  │  Option A: sstart.py       │              │
│  │  (multi-stream, continuous)│              │
│  │  ┌─────┐ ┌─────┐ ┌─────┐  │              │
│  │  │Cam 1│ │Cam 2│ │Cam 3│  │              │
│  │  └──┬──┘ └──┬──┘ └──┬──┘  │              │
│  │     └───┬───┘───┬───┘     │              │
│  │     YOLO+ByteTrack        │              │
│  │         │                  │              │
│  │   ai_car_counts (MySQL)   │              │
│  └────────────────────────────┘              │
│             OR                               │
│  ┌────────────────────────────┐              │
│  │  Option B: ai.worker.js   │              │
│  │  (BullMQ + Redis queue)   │              │
│  │  → spawns car_counter_    │              │
│  │    worker.py per frame    │              │
│  └────────────────────────────┘              │
│                                              │
│  ┌──────────────┐  ┌───────────┐             │
│  │  MySQL DB    │  │  Redis    │             │
│  │  (streams,   │  │  (job     │             │
│  │   counts)    │  │   queue)  │             │
│  └──────────────┘  └───────────┘             │
└──────────────────────────────────────────────┘
```

---

## Quick Start – Three Streams

```bash
# 1. Install dependencies
npm run install:all
cd backend/workers && pip install -r requirements.txt && cd ../..

# 2. Start the backend and frontend
npm run dev

# 3. In the web UI (http://localhost:3001):
#    - Add three cameras with your RTSP/HLS URLs
#    - Create counting zones in the annotation editor
#    - Assign zones to cameras
#    - Set ai_status to 'active' for each stream (via Start AI button)

# 4. Run the multi-stream worker (in a separate terminal):
cd backend
python workers/sstart.py --headless --save-interval 30

# The worker fetches all active streams from the database
# and processes them in a single RAM-efficient process.
```
