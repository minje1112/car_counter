-- Add AI columns to rtsp_streams table
ALTER TABLE rtsp_streams 
ADD COLUMN ai_status ENUM('inactive', 'active') DEFAULT 'inactive' AFTER status,
ADD COLUMN ai_interval INT DEFAULT 60 COMMENT 'AI job interval in seconds',
ADD COLUMN last_ai_count INT DEFAULT 0 COMMENT 'Last car count detected',
ADD COLUMN last_ai_check DATETIME NULL COMMENT 'Last time AI checked this stream';

-- Create ai_car_counts table for storing car counting results
CREATE TABLE IF NOT EXISTS ai_car_counts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stream_id INT NOT NULL,
  flowId VARCHAR(128) NOT NULL,
  polygon_id VARCHAR(128) NOT NULL,
  count INT NOT NULL DEFAULT 0,
  time DATETIME NOT NULL,
  interval_idx INT NOT NULL,
  INDEX idx_stream_id (stream_id),
  INDEX idx_time (time),
  INDEX idx_stream_time (stream_id, time),
  FOREIGN KEY (stream_id) REFERENCES rtsp_streams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI car counting results';


-- Create car_flow_records table for storing car flow details
CREATE TABLE IF NOT EXISTS car_flow_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stream_id INT NOT NULL,
  flowId VARCHAR(128) NOT NULL,
  trackId VARCHAR(128) NOT NULL,
  category INT NOT NULL,
  time_seconds VARCHAR(32) NOT NULL,
  INDEX idx_stream_id (stream_id),
  INDEX idx_time_seconds (time_seconds),
  INDEX idx_stream_time (stream_id, time_seconds),
  FOREIGN KEY (stream_id) REFERENCES rtsp_streams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Car flow records for AI tracking';
