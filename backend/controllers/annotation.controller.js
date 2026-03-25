const { getPool } = require('../config/database');

// Create new annotation
async function createAnnotation(req, res) {
  try {
    const { location, imageUrl, annotations, timestamp, cameraId } = req.body;
    
    // Validate required fields (imageUrl is optional)
    if (!location || !annotations) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: location and annotations are required'
      });
    }
    
    const pool = getPool();
    
    // Insert annotation with organization and user info
    const query = `
      INSERT INTO annotations (organization_id, user_id, camera_id, location, image_url, annotations, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const annotationsJson = JSON.stringify(annotations);
    const timestampValue = timestamp || new Date().toISOString();
    
    const [result] = await pool.query(query, [
      req.user.organization_id,
      req.user.id,
      cameraId || null,
      location,
      imageUrl || null,
      annotationsJson,
      timestampValue
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Annotation created successfully',
      data: {
        id: result.insertId,
        organization_id: req.user.organization_id,
        user_id: req.user.id,
        cameraId: cameraId || null,
        location,
        imageUrl: imageUrl || null,
        annotations,
        timestamp: timestampValue
      }
    });
  } catch (error) {
    console.error('Error creating annotation:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating annotation',
      error: error.message
    });
  }
}

// Get all annotations (filtered by organization)
async function getAllAnnotations(req, res) {
  try {
    const pool = getPool();
    
    // Users can only see annotations from their organization
    const query = `
      SELECT a.*, u.name as created_by_name
      FROM annotations a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.organization_id = ?
      ORDER BY a.created_at DESC
    `;
    
    const [rows] = await pool.query(query, [req.user.organization_id]);
    
    // Parse JSON annotations
    const annotations = rows.map(row => ({
      id: row.id,
      organization_id: row.organization_id,
      user_id: row.user_id,
      created_by: row.created_by_name,
      location: row.location,
      cameraId: row.camera_id,
      imageUrl: row.image_url,
      annotations: typeof row.annotations === 'string' ? JSON.parse(row.annotations) : row.annotations,
      timestamp: row.timestamp,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    res.status(200).json({
      success: true,
      count: annotations.length,
      data: annotations
    });
  } catch (error) {
    console.error('Error fetching annotations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching annotations',
      error: error.message
    });
  }
}

// Get annotation by ID
async function getAnnotationById(req, res) {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    // Check organization access
    const query = `
      SELECT a.*, u.name as created_by_name
      FROM annotations a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.id = ? AND a.organization_id = ?
    `;
    const [rows] = await pool.query(query, [id, req.user.organization_id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Annotation not found'
      });
    }
    
    const row = rows[0];
    const annotation = {
      id: row.id,
      organization_id: row.organization_id,
      user_id: row.user_id,
      created_by: row.created_by_name,
      location: row.location,
      cameraId: row.camera_id,
      imageUrl: row.image_url,
      annotations: typeof row.annotations === 'string' ? JSON.parse(row.annotations) : row.annotations,
      timestamp: row.timestamp,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    
    res.status(200).json({
      success: true,
      data: annotation
    });
  } catch (error) {
    console.error('Error fetching annotation:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching annotation',
      error: error.message
    });
  }
}

// Update annotation by ID
async function updateAnnotation(req, res) {
  try {
    const { id } = req.params;
    const { location, imageUrl, annotations, timestamp, cameraId } = req.body;
    const pool = getPool();
    
    // Check if annotation exists and belongs to user's organization
    const [existing] = await pool.query(
      'SELECT id FROM annotations WHERE id = ? AND organization_id = ?',
      [id, req.user.organization_id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Annotation not found'
      });
    }
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    
    if (location !== undefined) {
      updates.push('location = ?');
      values.push(location);
    }
    if (cameraId !== undefined) {
      updates.push('camera_id = ?');
      values.push(cameraId);
    }
    if (imageUrl !== undefined) {
      updates.push('image_url = ?');
      values.push(imageUrl);
    }
    if (annotations !== undefined) {
      updates.push('annotations = ?');
      values.push(JSON.stringify(annotations));
    }
    if (timestamp !== undefined) {
      updates.push('timestamp = ?');
      // Convert ISO timestamp to MySQL datetime format
      const mysqlTimestamp = new Date(timestamp).toISOString().slice(0, 19).replace('T', ' ');
      values.push(mysqlTimestamp);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    // Add updated_at timestamp
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    values.push(req.user.organization_id);
    
    const updateQuery = `UPDATE annotations SET ${updates.join(', ')} WHERE id = ? AND organization_id = ?`;
    await pool.query(updateQuery, values);
    
    // Fetch updated annotation
    const [updated] = await pool.query(
      'SELECT * FROM annotations WHERE id = ? AND organization_id = ?',
      [id, req.user.organization_id]
    );
    const row = updated[0];
    
    res.status(200).json({
      success: true,
      message: 'Annotation updated successfully',
      data: {
        id: row.id,
        organization_id: row.organization_id,
        user_id: row.user_id,
        cameraId: row.camera_id,
        location: row.location,
        imageUrl: row.image_url,
        annotations: typeof row.annotations === 'string' ? JSON.parse(row.annotations) : row.annotations,
        timestamp: row.timestamp,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    console.error('Error updating annotation:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating annotation',
      error: error.message
    });
  }
}

// Delete annotation by ID
async function deleteAnnotation(req, res) {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    // Delete only if belongs to user's organization
    const [result] = await pool.query(
      'DELETE FROM annotations WHERE id = ? AND organization_id = ?',
      [id, req.user.organization_id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Annotation not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Annotation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting annotation:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting annotation',
      error: error.message
    });
  }
}

module.exports = {
  createAnnotation,
  getAllAnnotations,
  getAnnotationById,
  updateAnnotation,
  deleteAnnotation
};
