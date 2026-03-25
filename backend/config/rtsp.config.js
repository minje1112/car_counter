// RTSP and Media Configuration
module.exports = {
  // Default maximum files to save (can be overridden by database settings)
  defaultMaxFiles: 20,
  
  // Video clip settings
  videoClip: {
    duration: 10, // seconds
    format: 'mp4',
    quality: 'high' // high, medium, low
  },
  
  // Snapshot settings
  snapshot: {
    format: 'jpg', // jpg, png
    quality: 85, // 0-100
    width: 1920,
    height: 1080
  },
  
  // Grid configuration for display
  grid: {
    rows: 10,
    columns: 10,
    maxStreams: 100
  },
  
  // File storage limits
  storage: {
    maxVideoSize: 100 * 1024 * 1024, // 100MB per video clip
    maxSnapshotSize: 10 * 1024 * 1024, // 10MB per snapshot
    autoCleanup: true, // Auto delete oldest when limit reached
    retentionDays: 30 // Keep files for 30 days
  },
  
  // RTSP stream settings
  rtsp: {
    reconnectInterval: 5000, // 5 seconds
    timeout: 30000, // 30 seconds
    bufferSize: 1024 * 1024, // 1MB
    transport: 'tcp' // tcp or udp
  },
  
  // AI Model settings (for future Python integration)
  ai: {
    enabled: false,
    modelPath: './models',
    detectionInterval: 1000, // Process every 1 second
    confidenceThreshold: 0.5,
    saveDetections: true
  }
};
