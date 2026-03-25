const { Worker } = require('bullmq');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { redisConnection } = require('../config/queue.config');
const { getPool, initializeDatabase } = require('../config/database');

// Global Socket.IO instance (set by server.js)
let io = null;
const setSocketIO = (socketInstance) => {
  io = socketInstance;
  console.log('Socket.IO instance set for AI worker');
};

// Initialize database before starting worker
let dbInitialized = false;

const initDB = async () => {
  if (!dbInitialized) {
    try {
      await initializeDatabase();
      dbInitialized = true;
      console.log('Database initialized for AI worker');
    } catch (error) {
      console.error('Failed to initialize database for AI worker:', error);
      throw error;
    }
  }
};

// Initialize database immediately
initDB().catch(console.error);

// Determine Python executable path
const getPythonPath = () => {
  // Check for virtual environment first (.venv)
  const venvPath = path.join(__dirname, '..', '..', '.venv', 'Scripts', 'python.exe');
  if (fs.existsSync(venvPath)) {
    console.log(`Found venv Python at: ${venvPath}`);
    return venvPath;
  }
  
  // Fallback to system Python
  const commonPaths = [
    'python',
    'python3',
  ];
  
  return commonPaths[0]; // Default to 'python' and let system resolve it
};

// Python worker for AI car counting
const aiWorker = new Worker(
  'ai-car-counting',
  async (job) => {
    // Ensure database is initialized
    await initDB();
    
    console.log(`Processing job ${job.id} for stream ${job.data.streamId}`);
    console.log(job);
    
    const { streamId, rtspUrl, annotationId, annotationRules } = job.data;
    const frameOutputPath = path.join(__dirname, '..', 'assets', 'temp', `frame_${streamId}_${Date.now()}.jpg`);
    let rulesJson = null; // Track temp files for cleanup
    
    return new Promise((resolve, reject) => {
      // Prepare arguments for Python script using argparse format
      const pythonArgs = [
        path.join(__dirname, 'sstart.py'),
        '--video_path', rtspUrl,
        '--stream_id', streamId.toString(),
        '--csv_path', frameOutputPath
      ];
      
      // Add annotation rules as JSON if available
      if (annotationRules) {
        rulesJson = path.join(__dirname, '..', 'assets', 'temp', `rules_${streamId}_${Date.now()}.json`);
        fs.writeFileSync(rulesJson, JSON.stringify(annotationRules));
        pythonArgs.push('--json_path', rulesJson);
        console.log(`✓ Created rules JSON: ${rulesJson}`);
      }
      
      // Get Python executable path
      const pythonPath = getPythonPath();
      console.log(`Using Python: ${pythonPath}`);
      console.log(`Python args: ${pythonArgs.join(' ')}`);
      
      // Call Python worker
      const pythonProcess = spawn(pythonPath, pythonArgs);
      
      let outputData = '';
      let errorData = '';
      
      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
        console.error('Python error:', data.toString());
      });
      
      const timeoutMs = Number(process.env.AI_TIMEOUT_MS) || 120000; // default 120s
      console.log(`AI worker timeout set to ${timeoutMs} ms`);

      // Track timeout so we can clear it if process finishes earlier
      const timeout = setTimeout(() => {
        try {
          pythonProcess.kill();
        } catch (e) {
          // ignore kill errors
        }
        reject(new Error('AI processing timeout'));
      }, timeoutMs);

      // Ensure timeout is cleared and errors handled when process exits
      pythonProcess.on('error', (err) => {
        clearTimeout(timeout);
        console.error('Python process error:', err);
        reject(err);
      });

      pythonProcess.on('close', async (code) => {
        clearTimeout(timeout);
        
        // Cleanup temporary files (both JSON and frame files)
        const cleanupTempFiles = () => {
          // Delete rules JSON
          if (rulesJson && fs.existsSync(rulesJson)) {
            try {
              fs.unlinkSync(rulesJson);
              console.log(`🗑️ Cleaned up rules JSON: ${rulesJson}`);
            } catch (err) {
              console.warn(`Warning: Could not delete rules JSON file: ${err.message}`);
            }
          }
          
          // Delete frame output file
          if (frameOutputPath && fs.existsSync(frameOutputPath)) {
            try {
              fs.unlinkSync(frameOutputPath);
              console.log(`🗑️ Cleaned up frame file: ${frameOutputPath}`);
            } catch (err) {
              console.warn(`Warning: Could not delete frame file: ${err.message}`);
            }
          }
        };
        
        if (code !== 0) {
          console.error('❌ Python process failed:', errorData);
          cleanupTempFiles();
          reject(new Error(`Python process exited with code ${code}`));
          return;
        }

        try {
          // The Python worker (sstart.py) saves counts directly to the database.
          // Query the DB for the most recent total count for this stream so the
          // frontend receives an accurate value even though the JSON output
          // reports car_count: 0 (counts are accumulated per region in the DB).
          const pool = getPool();

          const [recentRows] = await pool.query(
            `SELECT COALESCE(SUM(count), 0) AS total_count
             FROM ai_car_counts
             WHERE stream_id = ? AND count IS NOT NULL
               AND created_at >= NOW() - INTERVAL 10 MINUTE`,
            [streamId]
          );
          const latestCount = Number(recentRows[0]?.total_count) || 0;

          console.log(`📊 AI result for stream ${streamId}: ${latestCount} vehicles counted (from DB)`);

          // Update stream with latest count timestamp
          await pool.query(
            'UPDATE rtsp_streams SET last_ai_count = ?, last_ai_check = NOW() WHERE id = ?',
            [latestCount, streamId]
          );
          console.log(`✓ Updated stream ${streamId} last_ai_count = ${latestCount}`);

          // Cleanup temp files
          cleanupTempFiles();

          resolve({
            streamId,
            carCount: latestCount,
            detections: 0,
            timestamp: new Date().toISOString(),
            hasAnnotationRules: !!annotationRules,
            dataSaved: true
          });

        } catch (error) {
          console.error('❌ Error querying database after Python worker:', error);
          cleanupTempFiles();
          reject(error);
        }
      });
    });
  },
  {
    connection: redisConnection,
    concurrency: 3, // Process up to 3 streams concurrently
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000, // per minute
    },
  }
);

// Worker event handlers
aiWorker.on('completed', (job, result) => {
  console.log(`✓ Job ${job.id} completed for stream ${result.streamId}:`, result);
  
  // Emit via Socket.IO (only when job completes, no spam)
  if (io) {
    io.emit('ai-job-completed', {
      jobId: job.id,
      streamId: result.streamId,
      carCount: result.carCount,
      detections: result.detections,
      timestamp: result.timestamp,
      hasAnnotationRules: result.hasAnnotationRules,
      dataSaved: result.dataSaved
    });
    console.log(`📡 Emitted ai-job-completed for stream ${result.streamId}`);
  }
});

aiWorker.on('failed', (job, err) => {
  console.error(`✗ Job ${job.id} failed:`, err.message);
  
  // Emit failure via Socket.IO
  if (io) {
    io.emit('ai-job-failed', {
      jobId: job.id,
      streamId: job.data?.streamId,
      error: err.message,
      timestamp: new Date().toISOString()
    });
    console.log(`📡 Emitted ai-job-failed for stream ${job.data?.streamId}`);
  }
});

aiWorker.on('error', (err) => {
  console.error('Worker error:', err);
});
console.log('-------------------------------------------------')
console.log('AI Car Counting Worker started');

module.exports = aiWorker;
module.exports.setSocketIO = setSocketIO;
