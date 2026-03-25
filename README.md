# 🚗 Car Counter — AI-Powered Vehicle Counting System

A full-stack application that counts vehicles in real-time using RTSP camera streams and a YOLOv8 AI model. Features a web dashboard for managing cameras, drawing annotation regions, and viewing live counts.

---

## 📐 Architecture

```
┌─────────────────┐      HTTP/REST      ┌──────────────────────────┐
│  Frontend        │◄───────────────────►│  Backend (Express)        │
│  Next.js :3001  │      WebSocket      │  Node.js :3000            │
└─────────────────┘◄───────────────────►│  MySQL  │  Redis (BullMQ)│
                                         └────────────┬─────────────┘
                                                      │ spawns
                                              ┌───────▼────────┐
                                              │  AI Worker      │
                                              │  Python/YOLOv8  │
                                              │  sstart.py      │
                                              └────────────────┘
```

| Component    | Technology            | Port  | Purpose                             |
|------------- |-----------------------|-------|-------------------------------------|
| Frontend     | Next.js 16 + React 19 | 3001  | Dashboard, annotations, live counts |
| Backend      | Express.js + MySQL    | 3000  | REST API, job management, auth      |
| Database     | MySQL                 | 3306  | Stores streams, counts, users       |
| Job Queue    | Redis + BullMQ        | 6379  | Schedules AI counting jobs          |
| AI Worker    | Python 3 + YOLOv8     | —     | Vehicle detection & counting        |

---

## ✅ Prerequisites

Install the following before running the project:

| Tool         | Version  | Install                                        |
|------------- |----------|------------------------------------------------|
| Node.js      | 18+      | https://nodejs.org                             |
| Python       | 3.8+     | https://python.org                             |
| MySQL        | 8+       | https://dev.mysql.com/downloads/               |
| Redis        | 6+       | https://redis.io/download (or `brew install redis`) |
| FFmpeg       | any      | https://ffmpeg.org/download.html               |

Verify installations:
```bash
node --version   # v18+
python --version # 3.8+
mysql --version
redis-cli ping   # PONG
ffmpeg -version
```

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd car_counter

# Install all Node.js dependencies
npm run install:all
```

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and set your MySQL credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=car_counter_db
PORT=3000
JWT_SECRET=change-this-to-a-random-secret-in-production
REDIS_HOST=localhost
REDIS_PORT=6379
AI_TIMEOUT_MS=120000
```

### 3. Configure Frontend

```bash
cd frontend
cp .env.local.example .env.local
```

The default `frontend/.env.local` is already set correctly:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 4. Install Python AI Dependencies

```bash
cd backend/workers
pip install -r requirements.txt
```

> ⚠️ **GPU (optional):** For faster inference, install PyTorch with CUDA support first:
> ```bash
> pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
> ```

### 5. Start Services

Make sure MySQL and Redis are running, then start everything:

```bash
# Start MySQL (if not already running)
# Linux: sudo systemctl start mysql
# macOS: brew services start mysql
# Windows: net start MySQL80

# Start Redis (if not already running)
# Linux: sudo systemctl start redis
# macOS: brew services start redis
# Windows: Use Redis Windows installer

# Start the full application (backend + frontend + AI worker)
cd car_counter   # root of repo
npm run dev
```

Or start each component individually:
```bash
npm run dev:backend   # Backend API on :3000
npm run dev:frontend  # Frontend on :3001
npm run dev:worker    # AI BullMQ worker
```

### 6. Open the App

- **Dashboard:** http://localhost:3001
- **API Docs (Swagger):** http://localhost:3000/api-docs

**Default credentials:** `admin@admin.com` / `admin`
(Created automatically on first backend start)

---

## 🏗️ Project Structure

```
car_counter/
├── backend/                    # Node.js/Express API
│   ├── config/
│   │   ├── database.js         # MySQL pool + table auto-init
│   │   ├── queue.config.js     # Redis + BullMQ setup
│   │   └── swagger.js          # API documentation config
│   ├── controllers/            # Business logic per resource
│   ├── routes/                 # API route definitions
│   ├── middleware/
│   │   └── auth.middleware.js  # JWT authentication
│   ├── workers/
│   │   ├── ai.worker.js        # BullMQ worker (manages Python jobs)
│   │   ├── sstart.py           # Python AI worker (YOLOv8 inference)
│   │   ├── client.py           # Robust RTSP client
│   │   ├── utils.py            # Region detection helpers
│   │   ├── requirements.txt    # Python dependencies
│   │   └── model/
│   │       └── best_26.pt      # Custom YOLOv8 model (vehicles)
│   ├── server.js               # Express + Socket.IO server
│   ├── ecosystem.config.js     # PM2 production config
│   └── .env.example            # Environment variable template
├── frontend/                   # Next.js React app
│   ├── app/
│   │   ├── page.tsx            # Main dashboard
│   │   ├── editor/page.tsx     # Annotation region editor
│   │   ├── settings/page.tsx   # Settings page
│   │   └── login/page.tsx      # Login page
│   ├── components/             # React UI components
│   ├── lib/
│   │   ├── api/                # API client functions
│   │   ├── config.ts           # Frontend config (API base URL)
│   │   └── useAISocket.ts      # Socket.IO hook for live updates
│   └── .env.local.example      # Frontend env template
└── package.json                # Root monorepo scripts
```

---

## 🔌 API Overview

Full interactive documentation is available at http://localhost:3000/api-docs

### Authentication
```
POST /api/auth/register     Create a new user account
POST /api/auth/login        Login (returns JWT token)
GET  /api/auth/profile      Get current user profile
```

### Camera Streams (RTSP)
```
GET    /api/rtsp/streams         List all cameras
POST   /api/rtsp/streams         Add new camera
PUT    /api/rtsp/streams/:id     Update camera
DELETE /api/rtsp/streams/:id     Remove camera
```

### AI Car Counting
```
POST /api/ai/streams/:id/start    Start counting (interval in seconds)
POST /api/ai/streams/:id/stop     Stop counting
GET  /api/ai/streams/:id/status   Get current status & recent counts
GET  /api/ai/streams/:id/stats    Get statistics (total, avg, max, min)
```

### Annotations
```
GET    /api/annotations          List all annotations
POST   /api/annotations          Create annotation (region polygons)
PUT    /api/annotations/:id      Update annotation
DELETE /api/annotations/:id      Delete annotation
```

---

## 🤖 AI Worker Flow

```
1. User clicks "Start AI" on dashboard
2. Frontend → POST /api/ai/streams/:id/start { interval: 60 }
3. Backend adds repeatable job to BullMQ queue (runs every 60s)
4. ai.worker.js picks up the job
5. Spawns: python sstart.py --video_path <rtsp_url> --stream_id <id>
6. Python connects to RTSP stream via OpenCV
7. YOLOv8 (best_26.pt) detects and tracks vehicles
8. Per-region counts are saved to ai_car_counts table
9. Vehicle crossings saved to car_flow_records table
10. Node worker queries DB and emits Socket.IO event: ai-job-completed
11. Frontend receives event and updates live count display
```

### AI Model Details
- **Model:** Custom YOLOv8 (`best_26.pt`) trained on vehicle images
- **Vehicle classes:** Car, Motorcycle, Bus, Truck
- **Confidence threshold:** 0.3
- **GPU:** Auto-detected (CUDA used if available)
- **Tracking:** ByteTrack for vehicle trajectory

---

## 🐳 Docker / Production

For production use with PM2:
```bash
cd backend
npm run pm2:start    # Start backend + AI worker via PM2
npm run pm2:status   # Check process status
npm run pm2:logs     # View logs
npm run pm2:stop     # Stop all processes
```

The `ecosystem.config.js` manages two processes:
- `api-server` — the Express backend
- `ai-worker` — the BullMQ/Python AI worker

---

## 🔧 Troubleshooting

### Backend won't start
- Ensure MySQL is running and credentials in `.env` are correct
- The database and all tables are created automatically on first run

### AI jobs not processing
- Ensure Redis is running: `redis-cli ping` → should return `PONG`
- Ensure Python deps are installed: `pip install -r backend/workers/requirements.txt`
- Check that `backend/workers/model/best_26.pt` exists

### RTSP stream not connecting
- Verify the RTSP URL: `ffmpeg -i "rtsp://..." -t 1 -f null -`
- Check network access to the camera

### Frontend can't reach backend
- Confirm backend is on port 3000: `curl http://localhost:3000/api-docs`
- Verify `NEXT_PUBLIC_API_URL` in `frontend/.env.local`

---

## 🔐 Security Notes

- **Change `JWT_SECRET`** in `.env` before any public deployment
- The default `admin@admin.com` / `admin` account is for development only
- Do not commit `.env` or `.env.local` files to source control
