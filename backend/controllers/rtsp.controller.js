const { getPool } = require('../config/database');
const path = require('path');
const fs = require('fs').promises;

// Add RTSP stream
async function addRtspStream(req, res) {
  try {
    const { name, rtspUrl, description, location, annotationId } = req.body;
    
    if (!name || !rtspUrl) {
      return res.status(400).json({
        success: false,
        message: 'Name and RTSP URL are required'
      });
    }
    
    const pool = getPool();
    
    // Verify annotation exists and belongs to organization if provided
    if (annotationId) {
      const [annotation] = await pool.query(
        'SELECT id FROM annotations WHERE id = ? AND organization_id = ?',
        [annotationId, req.user.organization_id]
      );
      
      if (annotation.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Annotation not found or does not belong to your organization'
        });
      }
    }
    
    const query = `
      INSERT INTO rtsp_streams (name, rtsp_url, description, location, annotation_id, status, organization_id, user_id)
      VALUES (?, ?, ?, ?, ?, 'inactive', ?, ?)
    `;
    
    const [result] = await pool.query(query, [name, rtspUrl, description, location, annotationId || null, req.user.organization_id, req.user.id]);
    
    res.status(201).json({
      success: true,
      message: 'RTSP stream added successfully',
      data: {
        id: result.insertId,
        name,
        rtspUrl,
        description,
        location,
        annotationId: annotationId || null,
        status: 'inactive'
      }
    });
  } catch (error) {
    console.error('Error adding RTSP stream:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding RTSP stream',
      error: error.message
    });
  }
}

// Get all RTSP streams
async function getAllRtspStreams(req, res) {
  try {
    const pool = getPool();
    const { status } = req.query;
    
    let query = `
      SELECT 
        s.*,
        a.location as annotation_location,
        a.image_url as annotation_image_url
      FROM rtsp_streams s
      LEFT JOIN annotations a ON s.annotation_id = a.id
      WHERE s.organization_id = ?
    `;
    const params = [req.user.organization_id];
    
    if (status) {
      query += ' AND s.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY s.created_at DESC';
    
    const [rows] = await pool.query(query, params);
    
    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching RTSP streams:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching RTSP streams',
      error: error.message
    });
  }
}

// Get single RTSP stream by ID
async function getRtspStreamById(req, res) {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    const query = 'SELECT * FROM rtsp_streams WHERE id = ? AND organization_id = ?';
    const [rows] = await pool.query(query, [id, req.user.organization_id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'RTSP stream not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching RTSP stream:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching RTSP stream',
      error: error.message
    });
  }
}

// Update RTSP stream
async function updateRtspStream(req, res) {
  try {
    const { id } = req.params;
    const { name, rtspUrl, description, location, status, recordingEnabled, annotationId } = req.body;
    const pool = getPool();
    
    // Verify annotation exists and belongs to organization if provided
    if (annotationId !== undefined && annotationId !== null) {
      const [annotation] = await pool.query(
        'SELECT id FROM annotations WHERE id = ? AND organization_id = ?',
        [annotationId, req.user.organization_id]
      );
      
      if (annotation.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Annotation not found or does not belong to your organization'
        });
      }
    }
    
    const updates = [];
    const values = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (rtspUrl !== undefined) {
      updates.push('rtsp_url = ?');
      values.push(rtspUrl);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (location !== undefined) {
      updates.push('location = ?');
      values.push(location);
    }
    if (annotationId !== undefined) {
      updates.push('annotation_id = ?');
      values.push(annotationId);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (recordingEnabled !== undefined) {
      updates.push('recording_enabled = ?');
      values.push(recordingEnabled);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    values.push(req.user.organization_id);
    
    const updateQuery = `UPDATE rtsp_streams SET ${updates.join(', ')} WHERE id = ? AND organization_id = ?`;
    const [result] = await pool.query(updateQuery, values);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'RTSP stream not found'
      });
    }
    
    const [updated] = await pool.query('SELECT * FROM rtsp_streams WHERE id = ? AND organization_id = ?', [id, req.user.organization_id]);
    
    res.status(200).json({
      success: true,
      message: 'RTSP stream updated successfully',
      data: updated[0]
    });
  } catch (error) {
    console.error('Error updating RTSP stream:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating RTSP stream',
      error: error.message
    });
  }
}

// Delete RTSP stream
async function deleteRtspStream(req, res) {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    // Verify stream exists and belongs to organization
    const [streamCheck] = await pool.query('SELECT * FROM rtsp_streams WHERE id = ? AND organization_id = ?', [id, req.user.organization_id]);
    
    if (streamCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'RTSP stream not found'
      });
    }
    
    // Delete associated clips first (cascade will handle this, but we clean up files)
    const [clips] = await pool.query('SELECT * FROM rtsp_clips WHERE stream_id = ?', [id]);
    
    for (const clip of clips) {
      try {
        await fs.unlink(path.join(__dirname, '..', clip.file_path));
      } catch (err) {
        console.error('Error deleting clip file:', err);
      }
    }
    
    const query = 'DELETE FROM rtsp_streams WHERE id = ? AND organization_id = ?';
    const [result] = await pool.query(query, [id, req.user.organization_id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'RTSP stream not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'RTSP stream and associated clips deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting RTSP stream:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting RTSP stream',
      error: error.message
    });
  }
}

// Capture snapshot from RTSP stream
// NOTE: This is a placeholder - requires ffmpeg or Python/OpenCV integration
async function captureSnapshot(req, res) {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    // Get stream info and verify organization access
    const [streams] = await pool.query('SELECT * FROM rtsp_streams WHERE id = ? AND organization_id = ?', [id, req.user.organization_id]);
    
    if (streams.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'RTSP stream not found'
      });
    }
    
    const stream = streams[0];
    
    // TODO: Implement actual snapshot capture using ffmpeg or Python
    // Example command: ffmpeg -i rtsp://url -frames:v 1 -q:v 2 output.jpg
    // Or use Python with OpenCV
    
    res.status(501).json({
      success: false,
      message: 'Snapshot capture not yet implemented. Requires ffmpeg or Python/OpenCV integration.',
      todo: {
        implementation: 'ffmpeg or Python OpenCV',
        command: `ffmpeg -i ${stream.rtsp_url} -frames:v 1 -q:v 2 assets/snapshot-${id}-${Date.now()}.jpg`,
        note: 'Add Python AI model integration here for object detection'
      }
    });
  } catch (error) {
    console.error('Error capturing snapshot:', error);
    res.status(500).json({
      success: false,
      message: 'Error capturing snapshot',
      error: error.message
    });
  }
}

// Capture 10-second video clip from RTSP stream
// NOTE: This is a placeholder - requires ffmpeg or Python integration
async function captureVideoClip(req, res) {
  try {
    const { id } = req.params;
    const { duration = 10 } = req.body;
    const pool = getPool();
    
    const [streams] = await pool.query('SELECT * FROM rtsp_streams WHERE id = ? AND organization_id = ?', [id, req.user.organization_id]);
    
    if (streams.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'RTSP stream not found'
      });
    }
    
    const stream = streams[0];
    
    // TODO: Implement actual video clip capture using ffmpeg
    // Example: ffmpeg -i rtsp://url -t 10 -c copy output.mp4
    
    res.status(501).json({
      success: false,
      message: 'Video clip capture not yet implemented. Requires ffmpeg integration.',
      todo: {
        implementation: 'ffmpeg',
        command: `ffmpeg -i ${stream.rtsp_url} -t ${duration} -c copy assets/clip-${id}-${Date.now()}.mp4`,
        note: 'Will save to assets folder and record in rtsp_clips table'
      }
    });
  } catch (error) {
    console.error('Error capturing video clip:', error);
    res.status(500).json({
      success: false,
      message: 'Error capturing video clip',
      error: error.message
    });
  }
}

// Get all clips for a stream
async function getStreamClips(req, res) {
  try {
    const { id } = req.params;
    const { type, limit = 20 } = req.query;
    const pool = getPool();
    
    let query = 'SELECT * FROM rtsp_clips WHERE stream_id = ?';
    const params = [id];
    
    if (type) {
      query += ' AND clip_type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const [rows] = await pool.query(query, params);
    
    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching stream clips:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stream clips',
      error: error.message
    });
  }
}

// Get all snapshots from all streams (for grid display)
async function getAllSnapshots(req, res) {
  try {
    const { limit = 20 } = req.query;
    const pool = getPool();
    
    const query = `
      SELECT 
        c.*,
        s.name as stream_name,
        s.location as stream_location
      FROM rtsp_clips c
      JOIN rtsp_streams s ON c.stream_id = s.id
      WHERE c.clip_type = 'snapshot' AND s.organization_id = ?
      ORDER BY c.created_at DESC
      LIMIT ?
    `;
    
    const [rows] = await pool.query(query, [req.user.organization_id, parseInt(limit)]);
    
    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching snapshots',
      error: error.message
    });
  }
}

// Get latest snapshot for each stream (for grid view)
async function getLatestSnapshotsPerStream(req, res) {
  try {
    const pool = getPool();
    
    const query = `
      SELECT 
        s.id as stream_id,
        s.name as stream_name,
        s.location as stream_location,
        s.rtsp_url,
        s.status,
        s.last_snapshot_at,
        c.id as clip_id,
        c.file_url as snapshot_url,
        c.file_name,
        c.created_at as snapshot_created_at
      FROM rtsp_streams s
      LEFT JOIN rtsp_clips c ON c.id = (
        SELECT id FROM rtsp_clips 
        WHERE stream_id = s.id AND clip_type = 'snapshot'
        ORDER BY created_at DESC LIMIT 1
      )
      WHERE s.organization_id = ?
      ORDER BY s.created_at DESC
    `;
    
    const [rows] = await pool.query(query, [req.user.organization_id]);
    
    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching latest snapshots:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching latest snapshots',
      error: error.message
    });
  }
}

// Assign annotation to RTSP stream
async function assignAnnotation(req, res) {
  try {
    const { id } = req.params;
    const { annotationId } = req.body;
    const pool = getPool();
    
    // Verify stream exists and belongs to organization
    const [streams] = await pool.query(
      'SELECT * FROM rtsp_streams WHERE id = ? AND organization_id = ?',
      [id, req.user.organization_id]
    );
    
    if (streams.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'RTSP stream not found'
      });
    }
    
    // Verify annotation exists and belongs to organization (if not null)
    if (annotationId !== null && annotationId !== undefined) {
      const [annotations] = await pool.query(
        'SELECT * FROM annotations WHERE id = ? AND organization_id = ?',
        [annotationId, req.user.organization_id]
      );
      
      if (annotations.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Annotation not found or does not belong to your organization'
        });
      }
    }
    
    // Update stream with annotation_id
    await pool.query(
      'UPDATE rtsp_streams SET annotation_id = ? WHERE id = ?',
      [annotationId || null, id]
    );
    
    // Fetch updated stream with annotation details
    const [updated] = await pool.query(`
      SELECT 
        s.*,
        a.location as annotation_location,
        a.image_url as annotation_image_url,
        a.annotations as annotation_rules
      FROM rtsp_streams s
      LEFT JOIN annotations a ON s.annotation_id = a.id
      WHERE s.id = ?
    `, [id]);
    
    res.status(200).json({
      success: true,
      message: annotationId ? 'Annotation assigned successfully' : 'Annotation removed successfully',
      data: updated[0]
    });
  } catch (error) {
    console.error('Error assigning annotation:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning annotation',
      error: error.message
    });
  }
}

module.exports = {
  addRtspStream,
  getAllRtspStreams,
  getRtspStreamById,
  updateRtspStream,
  deleteRtspStream,
  assignAnnotation,
  captureSnapshot,
  captureVideoClip,
  getStreamClips,
  getAllSnapshots,
  getLatestSnapshotsPerStream
};
