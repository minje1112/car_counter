const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

// Initialize database and table
async function initializeDatabase() {
  try {
    // Connect without database to create it if needed
    const connection = await mysql.createConnection(dbConfig);
    
    // Create database if not exists
    const dbName = process.env.DB_NAME || 'annotations_db';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Database '${dbName}' is ready`);
    
    await connection.end();
    
    // Now connect with database selected
    pool = mysql.createPool({
      ...dbConfig,
      database: dbName
    });
    
    // Create organizations table first (no dependencies)
    // Create organizations table if not exists
    const createOrganizationsTableQuery = `
      CREATE TABLE IF NOT EXISTS organizations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await pool.query(createOrganizationsTableQuery);
    console.log('Table "organizations" is ready');
    
    // Create users table if not exists
    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        organization_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20),
        role ENUM('admin', 'user') DEFAULT 'user',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        INDEX idx_email (email),
        INDEX idx_organization_id (organization_id),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await pool.query(createUsersTableQuery);
    console.log('Table "users" is ready');
    
    // Alter existing users table if it doesn't have organization_id column
    try {
      const [columns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'organization_id'
      `, [dbName]);
      
      if (columns.length === 0) {
        // Add organization_id column
        await pool.query('ALTER TABLE users ADD COLUMN organization_id INT NOT NULL DEFAULT 1 AFTER id');
        await pool.query('ALTER TABLE users ADD FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE');
        await pool.query('ALTER TABLE users ADD INDEX idx_organization_id (organization_id)');
        console.log('Added organization_id column to existing users table');
      }
      
      // Check for role column
      const [roleColumns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
      `, [dbName]);
      
      if (roleColumns.length === 0) {
        await pool.query("ALTER TABLE users ADD COLUMN role ENUM('admin', 'user') DEFAULT 'user' AFTER phone_number");
        await pool.query('ALTER TABLE users ADD INDEX idx_role (role)');
        console.log('Added role column to existing users table');
      }
      
      // Check for is_active column
      const [activeColumns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_active'
      `, [dbName]);
      
      if (activeColumns.length === 0) {
        await pool.query('ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER role');
        console.log('Added is_active column to existing users table');
      }
    } catch (alterError) {
      console.error('Error altering users table:', alterError.message);
    }
    
    // Create annotations table (depends on organizations and users)
    const createAnnotationsTableQuery = `
      CREATE TABLE IF NOT EXISTS annotations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        organization_id INT NOT NULL,
        user_id INT NOT NULL,
        camera_id INT NULL,
        location VARCHAR(255) NOT NULL,
        image_url TEXT NULL,
        annotations JSON NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_camera_id (camera_id),
        INDEX idx_organization_id (organization_id),
        INDEX idx_user_id (user_id),
        INDEX idx_location (location),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await pool.query(createAnnotationsTableQuery);
    console.log('Table "annotations" is ready');
    
    // Alter existing annotations table if it doesn't have organization_id column
    try {
      const [annOrgColumns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'annotations' AND COLUMN_NAME = 'organization_id'
      `, [dbName]);
      
      if (annOrgColumns.length === 0) {
        // Add organization_id column
        await pool.query('ALTER TABLE annotations ADD COLUMN organization_id INT NOT NULL DEFAULT 1 AFTER id');
        await pool.query('ALTER TABLE annotations ADD FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE');
        await pool.query('ALTER TABLE annotations ADD INDEX idx_organization_id (organization_id)');
        console.log('Added organization_id column to existing annotations table');
      }
      
      // Check for user_id column
      const [annUserColumns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'annotations' AND COLUMN_NAME = 'user_id'
      `, [dbName]);
      
      if (annUserColumns.length === 0) {
        await pool.query('ALTER TABLE annotations ADD COLUMN user_id INT NOT NULL DEFAULT 1 AFTER organization_id');
        await pool.query('ALTER TABLE annotations ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
        await pool.query('ALTER TABLE annotations ADD INDEX idx_user_id (user_id)');
        console.log('Added user_id column to existing annotations table');
      }
      // Check for camera_id column
      const [annCameraColumns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'annotations' AND COLUMN_NAME = 'camera_id'
      `, [dbName]);

      if (annCameraColumns.length === 0) {
        await pool.query('ALTER TABLE annotations ADD COLUMN camera_id INT NULL AFTER user_id');
        await pool.query('ALTER TABLE annotations ADD INDEX idx_camera_id (camera_id)');
        console.log('Added camera_id column to existing annotations table');
      }
    } catch (alterError) {
      console.error('Error altering annotations table:', alterError.message);
    }

      // Ensure existing annotations.image_url column allows NULL (modify if currently NOT NULL)
      try {
        const [imgCol] = await pool.query(`
          SELECT IS_NULLABLE
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'annotations' AND COLUMN_NAME = 'image_url'
        `, [dbName]);

        if (imgCol && imgCol.length > 0 && imgCol[0].IS_NULLABLE === 'NO') {
          await pool.query('ALTER TABLE annotations MODIFY COLUMN image_url TEXT NULL');
          console.log('Modified annotations.image_url to allow NULL');
        }
      } catch (modifyError) {
        console.error('Error ensuring annotations.image_url allows NULL:', modifyError.message);
      }
    
    // Create files table if not exists
    const createFilesTableQuery = `
      CREATE TABLE IF NOT EXISTS files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        organization_id INT NOT NULL,
        user_id INT NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL UNIQUE,
        file_path TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_type ENUM('image', 'video', 'other') NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        size BIGINT NOT NULL,
        slug VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_organization_id (organization_id),
        INDEX idx_user_id (user_id),
        INDEX idx_file_type (file_type),
        INDEX idx_slug (slug),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await pool.query(createFilesTableQuery);
    console.log('Table "files" is ready');
    
    // Alter existing files table if needed
    try {
      const [fileOrgColumns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'files' AND COLUMN_NAME = 'organization_id'
      `, [dbName]);
      
      if (fileOrgColumns.length === 0) {
        await pool.query('ALTER TABLE files ADD COLUMN organization_id INT NOT NULL DEFAULT 1 AFTER id');
        await pool.query('ALTER TABLE files ADD FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE');
        await pool.query('ALTER TABLE files ADD INDEX idx_organization_id (organization_id)');
        console.log('Added organization_id column to existing files table');
      }
      
      const [fileUserColumns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'files' AND COLUMN_NAME = 'user_id'
      `, [dbName]);
      
      if (fileUserColumns.length === 0) {
        await pool.query('ALTER TABLE files ADD COLUMN user_id INT NOT NULL DEFAULT 1 AFTER organization_id');
        await pool.query('ALTER TABLE files ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
        await pool.query('ALTER TABLE files ADD INDEX idx_user_id (user_id)');
        console.log('Added user_id column to existing files table');
      }
    } catch (alterError) {
      console.error('Error altering files table:', alterError.message);
    }
    
    // Create RTSP streams table if not exists
    const createRtspStreamsTableQuery = `
      CREATE TABLE IF NOT EXISTS rtsp_streams (
        id INT AUTO_INCREMENT PRIMARY KEY,
        organization_id INT NOT NULL,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        rtsp_url TEXT NOT NULL,
        description TEXT,
        location VARCHAR(255),
        annotation_id INT NULL COMMENT 'Reference to annotation rules for car counting',
        status ENUM('active', 'inactive', 'error') DEFAULT 'inactive',
        snapshot_url TEXT,
        last_snapshot_at TIMESTAMP NULL,
        recording_enabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE SET NULL,
        INDEX idx_organization_id (organization_id),
        INDEX idx_user_id (user_id),
        INDEX idx_annotation_id (annotation_id),
        INDEX idx_status (status),
        INDEX idx_location (location)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await pool.query(createRtspStreamsTableQuery);
    console.log('Table "rtsp_streams" is ready');
    
    // Alter existing rtsp_streams table if needed
    try {
      const [rtspOrgColumns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'rtsp_streams' AND COLUMN_NAME = 'organization_id'
      `, [dbName]);
      
      if (rtspOrgColumns.length === 0) {
        await pool.query('ALTER TABLE rtsp_streams ADD COLUMN organization_id INT NOT NULL DEFAULT 1 AFTER id');
        await pool.query('ALTER TABLE rtsp_streams ADD FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE');
        await pool.query('ALTER TABLE rtsp_streams ADD INDEX idx_organization_id (organization_id)');
        console.log('Added organization_id column to existing rtsp_streams table');
      }
      
      const [rtspUserColumns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'rtsp_streams' AND COLUMN_NAME = 'user_id'
      `, [dbName]);
      
      if (rtspUserColumns.length === 0) {
        await pool.query('ALTER TABLE rtsp_streams ADD COLUMN user_id INT NOT NULL DEFAULT 1 AFTER organization_id');
        await pool.query('ALTER TABLE rtsp_streams ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
        await pool.query('ALTER TABLE rtsp_streams ADD INDEX idx_user_id (user_id)');
        console.log('Added user_id column to existing rtsp_streams table');
      }
      
      // Check for annotation_id column
      const [rtspAnnotationColumns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'rtsp_streams' AND COLUMN_NAME = 'annotation_id'
      `, [dbName]);
      
      if (rtspAnnotationColumns.length === 0) {
        await pool.query('ALTER TABLE rtsp_streams ADD COLUMN annotation_id INT NULL COMMENT "Reference to annotation rules for car counting" AFTER location');
        await pool.query('ALTER TABLE rtsp_streams ADD CONSTRAINT fk_rtsp_annotation FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE SET NULL');
        await pool.query('ALTER TABLE rtsp_streams ADD INDEX idx_annotation_id (annotation_id)');
        console.log('Added annotation_id column to existing rtsp_streams table');
      }
    } catch (alterError) {
      console.error('Error altering rtsp_streams table:', alterError.message);
    }
    
    // Create RTSP clips table for video clips and snapshots
    const createRtspClipsTableQuery = `
      CREATE TABLE IF NOT EXISTS rtsp_clips (
        id INT AUTO_INCREMENT PRIMARY KEY,
        stream_id INT NOT NULL,
        clip_type ENUM('video', 'snapshot') NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_size BIGINT NOT NULL,
        duration INT NULL COMMENT 'Duration in seconds for videos',
        width INT NULL,
        height INT NULL,
        thumbnail_url TEXT,
        ai_detections JSON NULL COMMENT 'AI detection results',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (stream_id) REFERENCES rtsp_streams(id) ON DELETE CASCADE,
        INDEX idx_stream_id (stream_id),
        INDEX idx_clip_type (clip_type),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await pool.query(createRtspClipsTableQuery);
    console.log('Table "rtsp_clips" is ready');
    
    // Create system config table for dynamic settings
    const createSystemConfigTableQuery = `
      CREATE TABLE IF NOT EXISTS system_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_key VARCHAR(100) NOT NULL UNIQUE,
        config_value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_config_key (config_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await pool.query(createSystemConfigTableQuery);
    console.log('Table "system_config" is ready');
    
    // Create ai_car_counts table for storing car counting results
    const createAiCarCountsTableQuery = `
      CREATE TABLE IF NOT EXISTS ai_car_counts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        stream_id INT NOT NULL,
        car_count INT NOT NULL DEFAULT 0,
        detections LONGTEXT NULL COMMENT 'Detailed detection data from AI (JSON format)',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_stream_id (stream_id),
        INDEX idx_created_at (created_at),
        INDEX idx_stream_created (stream_id, created_at),
        FOREIGN KEY (stream_id) REFERENCES rtsp_streams(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await pool.query(createAiCarCountsTableQuery);
    console.log('Table "ai_car_counts" is ready');

    // Add extended columns to ai_car_counts for region-based tracking (used by Python worker)
    try {
      const [flowIdCol] = await pool.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ai_car_counts' AND COLUMN_NAME = 'flowId'
      `, [dbName]);
      if (flowIdCol.length === 0) {
        await pool.query(`
          ALTER TABLE ai_car_counts
          ADD COLUMN flowId VARCHAR(255) NULL COMMENT 'Region/flow name from annotation',
          ADD COLUMN polygon_id VARCHAR(255) NULL COMMENT 'Polygon identifier from annotation',
          ADD COLUMN count INT NULL COMMENT 'Vehicle count for this region/interval',
          ADD COLUMN time VARCHAR(50) NULL COMMENT 'Interval timestamp (region-based counting)',
          ADD COLUMN interval_idx INT NULL COMMENT 'Interval index for time-series counting'
        `);
        console.log('Added region-tracking columns to ai_car_counts table');
      }
    } catch (err) {
      console.warn('Warning: Could not add region columns to ai_car_counts:', err.message);
    }

    // Create car_flow_records table for per-vehicle crossing records (used by Python worker)
    const createCarFlowRecordsQuery = `
      CREATE TABLE IF NOT EXISTS car_flow_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        stream_id INT NOT NULL,
        flowId VARCHAR(255) NOT NULL COMMENT 'Region/flow name the vehicle crossed',
        trackId INT NOT NULL COMMENT 'YOLO tracking ID',
        category INT NOT NULL COMMENT 'Vehicle class ID',
        time_seconds VARCHAR(50) COMMENT 'Timestamp of crossing',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_stream_id (stream_id),
        INDEX idx_flow (stream_id, flowId),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (stream_id) REFERENCES rtsp_streams(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await pool.query(createCarFlowRecordsQuery);
    console.log('Table "car_flow_records" is ready');

    // Add AI columns to rtsp_streams if they don't exist
    try {
      const [aiStatusColumns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'rtsp_streams' AND COLUMN_NAME = 'ai_status'
      `, [dbName]);
      
      if (aiStatusColumns.length === 0) {
        await pool.query(`
          ALTER TABLE rtsp_streams 
          ADD COLUMN ai_status ENUM('inactive', 'active') DEFAULT 'inactive' AFTER status,
          ADD COLUMN ai_interval INT DEFAULT 60 COMMENT 'AI job interval in seconds',
          ADD COLUMN last_ai_count INT DEFAULT 0 COMMENT 'Last car count detected',
          ADD COLUMN last_ai_check DATETIME NULL COMMENT 'Last time AI checked this stream',
          ADD COLUMN ai_started_at DATETIME NULL COMMENT 'When the AI job was started'
        `);
        console.log('Added AI columns to rtsp_streams table');
      }
      
      // Check if ai_started_at column exists, if not add it
      const [aiStartedAtColumns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'rtsp_streams' AND COLUMN_NAME = 'ai_started_at'
      `, [dbName]);
      
      if (aiStartedAtColumns.length === 0) {
        await pool.query(`
          ALTER TABLE rtsp_streams 
          ADD COLUMN ai_started_at DATETIME NULL COMMENT 'When the AI job was started'
        `);
        console.log('Added ai_started_at column to rtsp_streams table');
      }
    } catch (aiAlterError) {
      console.error('Error adding AI columns to rtsp_streams:', aiAlterError.message);
    }
    
    // Create default admin organization and user if not exists
    const [orgCheck] = await pool.query('SELECT id FROM organizations WHERE name = ?', ['Default Organization']);
    let defaultOrgId;
    
    if (orgCheck.length === 0) {
      const [orgResult] = await pool.query(
        'INSERT INTO organizations (name, description, is_active) VALUES (?, ?, ?)',
        ['Default Organization', 'Default system organization', true]
      );
      defaultOrgId = orgResult.insertId;
      console.log('Default organization created');
    } else {
      defaultOrgId = orgCheck[0].id;
    }
    
    // Create default admin user if not exists
    const [userCheck] = await pool.query('SELECT id FROM users WHERE email = ?', ['admin@admin.com']);
    
    if (userCheck.length === 0) {
      const hashedPassword = await bcrypt.hash('admin', 10);
      await pool.query(
        'INSERT INTO users (organization_id, name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        [defaultOrgId, 'Admin', 'admin@admin.com', hashedPassword, 'admin', true]
      );
      console.log('Default admin user created (email: admin@admin.com, password: admin)');
    }
    
    // Insert default configuration values if not exists
    const defaultConfigs = [
      ['max_files', '20', 'Maximum number of files to keep'],
      ['grid_rows', '10', 'Grid display rows'],
      ['grid_columns', '10', 'Grid display columns'],
      ['video_clip_duration', '10', 'Video clip duration in seconds'],
      ['snapshot_quality', '85', 'Snapshot quality (0-100)'],
      ['auto_cleanup', 'true', 'Auto cleanup old files'],
      ['retention_days', '30', 'File retention days']
    ];
    
    for (const [key, value, description] of defaultConfigs) {
      await pool.query(
        'INSERT IGNORE INTO system_config (config_key, config_value, description) VALUES (?, ?, ?)',
        [key, value, description]
      );
    }
    console.log('Default system configuration loaded');
    
    return pool;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Get pool instance
function getPool() {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

module.exports = {
  initializeDatabase,
  getPool
};
