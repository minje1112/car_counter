# AI Worker - Car Counting

This directory contains the AI worker components for car counting from RTSP streams.

## Files

- **`car_counter_worker.py`** - Python AI worker using YOLOv8
- **`ai.worker.js`** - Node.js worker that manages BullMQ jobs and spawns Python processes
- **`requirements.txt`** - Python dependencies

## Setup

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- OpenCV - Video/image processing
- Ultralytics (YOLOv8) - AI object detection model
- PyTorch - Deep learning framework
- MySQL Connector - Database connection

### 2. Download YOLOv8 Model

The model downloads automatically on first run. Available models:
- `yolov8n.pt` - Nano (fastest, 3MB)
- `yolov8s.pt` - Small (9MB)
- `yolov8m.pt` - Medium (25MB)
- `yolov8l.pt` - Large (44MB)
- `yolov8x.pt` - Extra Large (68MB, most accurate)

Default: `yolov8n.pt`

## Running

### Standalone (Testing)

Test Python worker directly:
```bash
python car_counter_worker.py <stream_id> <rtsp_url> <output_path>

# Example:
python car_counter_worker.py 1 "rtsp://admin:pass@192.168.1.100:554/stream" "./test_frame.jpg"
```

### With Node Worker

```bash
node ai.worker.js
```

### With PM2 (Production)

```bash
pm2 start ecosystem.config.js
pm2 logs ai-worker
```

## How It Works

1. **Node Worker** receives job from BullMQ queue
2. **Spawns Python process** with stream details
3. **Python extracts frame** from RTSP using OpenCV
4. **YOLOv8 detects objects** in the frame
5. **Counts vehicles** (cars, trucks, buses, motorcycles)
6. **Saves results** to MySQL database
7. **Node Worker** updates stream status

## Configuration

### Detection Classes

The worker counts these COCO dataset classes:
- Class 2: Car
- Class 3: Motorcycle
- Class 5: Bus
- Class 7: Truck

### Confidence Threshold

Default: 0.5 (50% confidence)

Modify in `car_counter_worker.py`:
```python
result = counter.count_cars_from_frame(frame_path, confidence=0.5)
```

### Timeout

Jobs timeout after 30 seconds (configurable in `ai.worker.js`):
```javascript
setTimeout(() => {
  pythonProcess.kill();
  reject(new Error('AI processing timeout'));
}, 30000); // 30 seconds
```

## Performance

### Processing Time
- Frame extraction: ~1-2 seconds
- AI inference: ~0.5-3 seconds (depends on model)
- Total: ~2-5 seconds per count

### Concurrency
- Max 3 streams processed simultaneously
- Max 10 jobs per minute (rate limiting)

### Memory Usage
- YOLOv8n: ~500MB RAM
- YOLOv8x: ~2GB RAM

## Troubleshooting

### Python Not Found
```bash
# Windows: Use full Python path
# In ai.worker.js, change:
const pythonProcess = spawn('C:\\Python39\\python.exe', [...]);
```

### CUDA/GPU Support
```bash
# For GPU acceleration:
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

### OpenCV Video Error
```bash
# Install additional codecs:
pip install opencv-contrib-python
```

### Model Download Failed
```bash
# Manually download model:
# https://github.com/ultralytics/assets/releases
# Place in: ~/.cache/ultralytics/
```

## Environment Variables

Add to `.env`:
```env
# Python path (optional)
PYTHON_PATH=python

# Model path (optional)
AI_MODEL_PATH=yolov8n.pt
```

## Logs

View worker logs:
```bash
# PM2
pm2 logs ai-worker

# Direct
node ai.worker.js
```

## Security

- ✅ Worker runs in isolated process
- ✅ Crashes don't affect API server
- ✅ Timeout protection
- ✅ Input validation
- ✅ Database connection pooling

## Upgrading

### To Different Model
```python
# In car_counter_worker.py
counter = CarCounterAI(model_path='yolov8m.pt')
```

### To Custom Model
```python
# Train your own YOLOv8 model
# Replace with your .pt file
counter = CarCounterAI(model_path='./custom_model.pt')
```

---

For complete documentation, see [AI_CAR_COUNTING_GUIDE.md](../docs/AI_CAR_COUNTING_GUIDE.md)
