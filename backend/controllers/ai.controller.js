const { aiCarCountQueue } = require('../config/queue.config');
const { getPool } = require('../config/database');

/**
 * Start AI car counting for a specific stream
 */
async function startAIJob(req, res) {
  try {
    const { id } = req.params;
    const { interval = 60 } = req.body; // Default: count every 60 seconds (1 minute)
    
    const pool = getPool();
    
    // Get stream details with annotation rules
    const [streams] = await pool.query(`
      SELECT 
        s.*,
        a.annotations as annotation_rules
      FROM rtsp_streams s
      LEFT JOIN annotations a ON s.annotation_id = a.id
      WHERE s.id = ? AND s.organization_id = ?
    `, [id, req.user.organization_id]);
    
    if (streams.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found'
      });
    }
    
    const stream = streams[0];
    
    // Check if job already exists
    const existingJobs = await aiCarCountQueue.getRepeatableJobs();
    const jobKey = `stream-${id}`;
    const existingJob = existingJobs.find(job => job.name === jobKey);
    
    if (existingJob) {
      return res.status(400).json({
        success: false,
        message: 'AI job already running for this stream'
      });
    }
    
    // Parse annotation rules
    let annotationRules = null;
    if (stream.annotation_rules) {
      try {
        annotationRules = typeof stream.annotation_rules === 'string' 
          ? JSON.parse(stream.annotation_rules) 
          : stream.annotation_rules;
      } catch (e) {
        console.error('Error parsing annotation rules:', e);
      }
    }
    
    // Add repeatable job (runs every X seconds)
    const job = await aiCarCountQueue.add(
      jobKey,
      {
        streamId: stream.id,
        rtspUrl: stream.rtsp_url,
        organizationId: req.user.organization_id,
        annotationId: stream.annotation_id,
        annotationRules: annotationRules
      },
      {
        repeat: {
          every: interval * 1000, // Convert to milliseconds
        },
        jobId: jobKey,
      }
    );
    
    // Update stream status and record start time
    await pool.query(
      'UPDATE rtsp_streams SET ai_status = ?, ai_interval = ?, ai_started_at = NOW() WHERE id = ?',
      ['active', interval, id]
    );
    
    res.status(200).json({
      success: true,
      message: 'AI car counting started',
      data: {
        streamId: stream.id,
        streamName: stream.name,
        interval: interval,
        jobId: job.id,
        status: 'active',
        hasAnnotationRules: !!annotationRules
      }
    });
    
  } catch (error) {
    console.error('Error starting AI job:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting AI job',
      error: error.message
    });
  }
}

/**
 * Stop AI car counting for a specific stream
 */
async function stopAIJob(req, res) {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    // Verify stream ownership
    const [streams] = await pool.query(
      'SELECT * FROM rtsp_streams WHERE id = ? AND organization_id = ?',
      [id, req.user.organization_id]
    );
    
    if (streams.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found'
      });
    }
    
    // Remove repeatable job
    const jobKey = `stream-${id}`;
    const repeatableJobs = await aiCarCountQueue.getRepeatableJobs();
    const job = repeatableJobs.find(j => j.name === jobKey);
    
    if (job) {
      await aiCarCountQueue.removeRepeatableByKey(job.key);
    }
    
    // Update stream status
    await pool.query(
      'UPDATE rtsp_streams SET ai_status = ? WHERE id = ?',
      ['inactive', id]
    );
    
    res.status(200).json({
      success: true,
      message: 'AI car counting stopped',
      data: {
        streamId: id,
        status: 'inactive'
      }
    });
    
  } catch (error) {
    console.error('Error stopping AI job:', error);
    res.status(500).json({
      success: false,
      message: 'Error stopping AI job',
      error: error.message
    });
  }
}

/**
 * Restart AI car counting for a specific stream
 */
async function restartAIJob(req, res) {
  try {
    const { id } = req.params;
    const { interval = 60 } = req.body;
    const pool = getPool();
    
    // Get stream details with annotation rules
    const [streams] = await pool.query(`
      SELECT 
        s.*,
        a.annotations as annotation_rules
      FROM rtsp_streams s
      LEFT JOIN annotations a ON s.annotation_id = a.id
      WHERE s.id = ? AND s.organization_id = ?
    `, [id, req.user.organization_id]);
    
    if (streams.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found'
      });
    }
    
    const stream = streams[0];
    
    // Remove existing repeatable job if exists
    const jobKey = `stream-${id}`;
    const repeatableJobs = await aiCarCountQueue.getRepeatableJobs();
    const existingJob = repeatableJobs.find(j => j.name === jobKey);
    
    if (existingJob) {
      await aiCarCountQueue.removeRepeatableByKey(existingJob.key);
    }
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Parse annotation rules
    let annotationRules = null;
    if (stream.annotation_rules) {
      try {
        annotationRules = typeof stream.annotation_rules === 'string' 
          ? JSON.parse(stream.annotation_rules) 
          : stream.annotation_rules;
      } catch (e) {
        console.error('Error parsing annotation rules:', e);
      }
    }
    
    // Add new repeatable job with new interval
    const job = await aiCarCountQueue.add(
      jobKey,
      {
        streamId: stream.id,
        rtspUrl: stream.rtsp_url,
        organizationId: req.user.organization_id,
        annotationId: stream.annotation_id,
        annotationRules: annotationRules
      },
      {
        repeat: {
          every: interval * 1000,
        },
        jobId: jobKey,
      }
    );
    
    // Update stream status with new start time
    await pool.query(
      'UPDATE rtsp_streams SET ai_status = ?, ai_interval = ?, ai_started_at = NOW() WHERE id = ?',
      ['active', interval, id]
    );
    
    res.status(200).json({
      success: true,
      message: 'AI car counting restarted',
      data: {
        streamId: stream.id,
        streamName: stream.name,
        interval: interval,
        jobId: job.id,
        status: 'active',
        hasAnnotationRules: !!annotationRules
      }
    });
    
  } catch (error) {
    console.error('Error restarting AI job:', error);
    res.status(500).json({
      success: false,
      message: 'Error restarting AI job',
      error: error.message
    });
  }
}

/**
 * Get AI job status for a stream
 */
async function getAIJobStatus(req, res) {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    // Get stream details
    const [streams] = await pool.query(
      'SELECT id, name, ai_status, ai_interval, last_ai_count, last_ai_check FROM rtsp_streams WHERE id = ? AND organization_id = ?',
      [id, req.user.organization_id]
    );
    
    if (streams.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found'
      });
    }
    
    const stream = streams[0];
    
    // Check if job is running
    const jobKey = `stream-${id}`;
    const repeatableJobs = await aiCarCountQueue.getRepeatableJobs();
    const job = repeatableJobs.find(j => j.name === jobKey);
    
    // Get recent counts
    const [counts] = await pool.query(
      'SELECT * FROM ai_car_counts WHERE stream_id = ? ORDER BY created_at DESC LIMIT 10',
      [id]
    );
    
    res.status(200).json({
      success: true,
      data: {
        streamId: stream.id,
        streamName: stream.name,
        aiStatus: stream.ai_status,
        interval: stream.ai_interval,
        lastCount: stream.last_ai_count,
        lastCheck: stream.last_ai_check,
        isRunning: !!job,
        recentCounts: counts
      }
    });
    
  } catch (error) {
    console.error('Error getting AI job status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting AI job status',
      error: error.message
    });
  }
}

/**
 * Get all AI jobs status
 */
async function getAllAIJobsStatus(req, res) {
  try {
    const pool = getPool();
    
    // Get all streams with AI status
    const [streams] = await pool.query(
      'SELECT id, name, ai_status, ai_interval, last_ai_count, last_ai_check FROM rtsp_streams WHERE organization_id = ?',
      [req.user.organization_id]
    );
    
    // Get all repeatable jobs
    const repeatableJobs = await aiCarCountQueue.getRepeatableJobs();
    
    // Combine data
    const jobsStatus = streams.map(stream => {
      const jobKey = `stream-${stream.id}`;
      const job = repeatableJobs.find(j => j.name === jobKey);
      
      return {
        streamId: stream.id,
        streamName: stream.name,
        aiStatus: stream.ai_status,
        interval: stream.ai_interval,
        lastCount: stream.last_ai_count,
        lastCheck: stream.last_ai_check,
        isRunning: !!job
      };
    });
    
    res.status(200).json({
      success: true,
      count: jobsStatus.length,
      data: jobsStatus
    });
    
  } catch (error) {
    console.error('Error getting all AI jobs status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting AI jobs status',
      error: error.message
    });
  }
}

/**
 * Get car count statistics for a stream
 */
async function getCarCountStats(req, res) {
  try {
    const { id } = req.params;
    const { from, to, limit = 100 } = req.query;
    
    const pool = getPool();
    
    // Verify stream ownership
    const [streams] = await pool.query(
      'SELECT * FROM rtsp_streams WHERE id = ? AND organization_id = ?',
      [id, req.user.organization_id]
    );
    
    if (streams.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found'
      });
    }
    
    // Build query
    let query = 'SELECT * FROM ai_car_counts WHERE stream_id = ?';
    const params = [id];
    
    if (from) {
      query += ' AND created_at >= ?';
      params.push(from);
    }
    
    if (to) {
      query += ' AND created_at <= ?';
      params.push(to);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const [counts] = await pool.query(query, params);
    
    // Calculate statistics
    const totalCounts = counts.reduce((sum, record) => sum + record.car_count, 0);
    const avgCount = counts.length > 0 ? totalCounts / counts.length : 0;
    const maxCount = counts.length > 0 ? Math.max(...counts.map(c => c.car_count)) : 0;
    const minCount = counts.length > 0 ? Math.min(...counts.map(c => c.car_count)) : 0;
    
    res.status(200).json({
      success: true,
      data: {
        streamId: id,
        streamName: streams[0].name,
        aiStartedAt: streams[0].ai_started_at,
        statistics: {
          total: totalCounts,
          average: Math.round(avgCount * 100) / 100,
          max: maxCount,
          min: minCount,
          records: counts.length
        },
      }
    });
    
  } catch (error) {
    console.error('Error getting car count stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting car count statistics',
      error: error.message
    });
  }
}

module.exports = {
  startAIJob,
  stopAIJob,
  restartAIJob,
  getAIJobStatus,
  getAllAIJobsStatus,
  getCarCountStats
};
