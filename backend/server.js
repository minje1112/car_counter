const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

const { initializeDatabase } = require('./config/database');
const authRoutes = require('./routes/auth.routes');
const organizationRoutes = require('./routes/organization.routes');
const userRoutes = require('./routes/user.routes');
const annotationRoutes = require('./routes/annotation.routes');
const fileRoutes = require('./routes/file.routes');
const rtspRoutes = require('./routes/rtsp.routes');
const configRoutes = require('./routes/config.routes');
const aiRoutes = require('./routes/ai.routes');
const aiWorker = require('./workers/ai.worker');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
const PORT = process.env.PORT || 3000;

// Cleanup utility functions
const cleanupOldTempFiles = (dirPath, maxAgeMs = 3600000) => {
  // 3600000 ms = 1 hour
  try {
    if (!fs.existsSync(dirPath)) return;
    
    const now = Date.now();
    const files = fs.readdirSync(dirPath);
    let deletedCount = 0;
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      const fileAge = now - stats.mtimeMs;
      
      if (fileAge > maxAgeMs) {
        try {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`🗑️ Auto-deleted old temp file: ${file} (age: ${Math.round(fileAge / 1000)}s)`);
        } catch (err) {
          console.warn(`⚠️ Could not delete temp file ${file}: ${err.message}`);
        }
      }
    });
    
    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} old temp files`);
    }
  } catch (error) {
    console.error('Error cleaning up temp files:', error.message);
  }
};

const cleanupAllTempFiles = (dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) return;
    
    const files = fs.readdirSync(dirPath);
    let deletedCount = 0;
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      try {
        fs.unlinkSync(filePath);
        deletedCount++;
      } catch (err) {
        console.warn(`⚠️ Could not delete temp file ${file}: ${err.message}`);
      }
    });
    
    if (deletedCount > 0) {
      console.log(`🧹 Force cleaned ${deletedCount} temp files on startup`);
    }
  } catch (error) {
    console.error('Error force cleaning temp files:', error.message);
  }
};

// Set Socket.IO instance in AI worker
aiWorker.setSocketIO(io);

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`📱 Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`📱 Client disconnected: ${socket.id}`);
  });
});


// Middleware
app.use(cors()); // Enable CORS for all origins (public API)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from assets folder
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Konva API Documentation'
}));

// API Documentation page
app.get('/', (req, res) => {
  const htmlDoc = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Konva Annotation API Documentation</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }
    
    }
  </style>
</head>
<body>
 
</body>
</html>
  `;
  
  res.send(htmlDoc);
});

// API routes
app.use('/api', authRoutes);
app.use('/api', organizationRoutes);
app.use('/api', userRoutes);
app.use('/api', annotationRoutes);
app.use('/api', fileRoutes);
app.use('/api', rtspRoutes);
app.use('/api', configRoutes);
app.use('/api/ai', aiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  
  // Send 500 error response
  return res.status(500).json({
    success: false,
    message: 'Internal server error - Something went wrong on the server',
    error: process.env.NODE_ENV === 'production' ? 'Server error' : err.message,
    timestamp: new Date().toISOString()
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Create temp directory for AI frame processing
    const tempDir = path.join(__dirname, 'assets', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log('Created temp directory for AI processing');
    } else {
      // Clean up any old temp files on startup
      console.log('🧹 Checking for old temp files...');
      cleanupAllTempFiles(tempDir);
    }
    
    // Initialize database and create tables
    await initializeDatabase();
    console.log('Database initialized successfully');
    
    // Set up periodic cleanup (every 30 minutes)
    const cleanupInterval = setInterval(() => {
      console.log('⏰ Running periodic temp file cleanup...');
      cleanupOldTempFiles(tempDir, 3600000); // Delete files older than 1 hour
    }, 1800000); // Run every 30 minutes
    
    // Start server with Socket.IO
    server.listen(PORT, () => {
      console.log(`\n🚀 Server is running on port ${PORT}`);
      console.log(`📡 WebSocket: ws://localhost:${PORT}`);
      console.log(`📝 API Documentation:`);
      console.log(`\n✅ Database, tables, and WebSocket ready!`);
      console.log(`🧹 Temp file auto-cleanup enabled (every 30 minutes)\n`);
    });
    
    // Handle graceful shutdown and cleanup
    process.on('SIGINT', () => {
      console.log('\n🛑 Server shutting down...');
      clearInterval(cleanupInterval);
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = { app, server, io };
