const { getPool } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

// Upload file (image or video)
async function uploadFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { originalname, filename, mimetype, size, path: filePath } = req.file;
    const { slug } = req.body;

    // Determine file type (image or video)
    const fileType = mimetype.startsWith('image/') ? 'image' : mimetype.startsWith('video/') ? 'video' : 'other';
    
    // Create URL for accessing the file
    const fileUrl = `/assets/${filename}`;
    
    const pool = getPool();
    
    // Insert file info into database with organization context
    const query = `
      INSERT INTO files (original_name, file_name, file_path, file_url, file_type, mime_type, size, slug, organization_id, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const slugValue = slug || filename.split('.')[0];
    
    const [result] = await pool.query(query, [
      originalname,
      filename,
      filePath,
      fileUrl,
      fileType,
      mimetype,
      size,
      slugValue,
      req.user.organization_id,
      req.user.id
    ]);
    
    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        id: result.insertId,
        originalName: originalname,
        fileName: filename,
        fileUrl: fileUrl,
        fileType: fileType,
        mimeType: mimetype,
        size: size,
        slug: slugValue
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    
    // Clean up uploaded file if database insert fails
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file after failed upload:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: error.message
    });
  }
}

// Get all files
async function getAllFiles(req, res) {
  try {
    const pool = getPool();
    const { type } = req.query; // Optional filter by type (image/video)
    
    let query = 'SELECT * FROM files WHERE organization_id = ?';
    const params = [req.user.organization_id];
    
    if (type) {
      query += ' AND file_type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await pool.query(query, params);
    
    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching files',
      error: error.message
    });
  }
}

// Get file by ID
async function getFileById(req, res) {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    const query = 'SELECT * FROM files WHERE id = ? AND organization_id = ?';
    const [rows] = await pool.query(query, [id, req.user.organization_id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching file',
      error: error.message
    });
  }
}

// Get file by slug
async function getFileBySlug(req, res) {
  try {
    const { slug } = req.params;
    const pool = getPool();
    
    const query = 'SELECT * FROM files WHERE slug = ? AND organization_id = ?';
    const [rows] = await pool.query(query, [slug, req.user.organization_id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching file',
      error: error.message
    });
  }
}

// Update file name only
async function updateFileName(req, res) {
  try {
    const { id } = req.params;
    const { originalName, slug } = req.body;
    const pool = getPool();
    
    if (!originalName && !slug) {
      return res.status(400).json({
        success: false,
        message: 'originalName or slug is required'
      });
    }
    
    // Check if file exists and belongs to user's organization
    const checkQuery = 'SELECT * FROM files WHERE id = ? AND organization_id = ?';
    const [existing] = await pool.query(checkQuery, [id, req.user.organization_id]);
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    // Build update query
    const updates = [];
    const values = [];
    
    if (originalName) {
      updates.push('original_name = ?');
      values.push(originalName);
    }
    
    if (slug) {
      updates.push('slug = ?');
      values.push(slug);
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const updateQuery = `UPDATE files SET ${updates.join(', ')} WHERE id = ?`;
    await pool.query(updateQuery, values);
    
    // Fetch updated file
    const [updated] = await pool.query(checkQuery, [id]);
    
    res.status(200).json({
      success: true,
      message: 'File name updated successfully',
      data: updated[0]
    });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating file',
      error: error.message
    });
  }
}

// Delete file
async function deleteFile(req, res) {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    // Get file info first and verify organization access
    const selectQuery = 'SELECT * FROM files WHERE id = ? AND organization_id = ?';
    const [rows] = await pool.query(selectQuery, [id, req.user.organization_id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    const file = rows[0];
    
    // Delete from database
    const deleteQuery = 'DELETE FROM files WHERE id = ? AND organization_id = ?';
    await pool.query(deleteQuery, [id, req.user.organization_id]);
    
    // Delete physical file
    try {
      // Resolve stored path: it may be absolute or relative (e.g. 'assets/..')
      const storedPath = file.file_path || file.filePath || file.file_path;
      const resolvedPath = path.isAbsolute(storedPath)
        ? storedPath
        : path.resolve(__dirname, '..', storedPath);

      // Check existence before deleting to get clearer logs
      try {
        await fs.stat(resolvedPath);
        await fs.unlink(resolvedPath);
        console.log('Deleted physical file at', resolvedPath);
      } catch (fsErr) {
        console.warn('Physical file not found or could not be deleted:', resolvedPath, fsErr.message);
      }
    } catch (unlinkError) {
      console.error('Error deleting physical file:', unlinkError);
      // Continue even if file deletion fails
    }
    
    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: error.message
    });
  }
}

module.exports = {
  uploadFile,
  getAllFiles,
  getFileById,
  getFileBySlug,
  updateFileName,
  deleteFile
};
