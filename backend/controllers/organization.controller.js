const { getPool } = require('../config/database');

// Create organization (admin only)
async function createOrganization(req, res) {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Organization name is required'
      });
    }
    
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO organizations (name, description) VALUES (?, ?)',
      [name, description || null]
    );
    
    const [orgs] = await pool.query(
      'SELECT * FROM organizations WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      organization: orgs[0]
    });
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create organization'
    });
  }
}

// Get all organizations (admin only)
async function getAllOrganizations(req, res) {
  try {
    const pool = getPool();
    const [organizations] = await pool.query(
      'SELECT * FROM organizations ORDER BY created_at DESC'
    );
    
    res.json({
      success: true,
      count: organizations.length,
      organizations
    });
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch organizations'
    });
  }
}

// Get organization by ID
async function getOrganizationById(req, res) {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    // Check if user is admin or belongs to this organization
    if (req.user.role !== 'admin' && req.user.organization_id !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const [organizations] = await pool.query(
      'SELECT * FROM organizations WHERE id = ?',
      [id]
    );
    
    if (organizations.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }
    
    // Get user count for this organization
    const [userCount] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE organization_id = ?',
      [id]
    );
    
    const organization = {
      ...organizations[0],
      user_count: userCount[0].count
    };
    
    res.json({
      success: true,
      organization
    });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch organization'
    });
  }
}

// Update organization (admin only)
async function updateOrganization(req, res) {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;
    
    const pool = getPool();
    
    const updates = [];
    const values = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No update data provided'
      });
    }
    
    values.push(id);
    
    await pool.query(
      `UPDATE organizations SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    const [organizations] = await pool.query(
      'SELECT * FROM organizations WHERE id = ?',
      [id]
    );
    
    res.json({
      success: true,
      message: 'Organization updated successfully',
      organization: organizations[0]
    });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update organization'
    });
  }
}

// Delete organization (admin only)
async function deleteOrganization(req, res) {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    // Check if organization has users
    const [users] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE organization_id = ?',
      [id]
    );
    
    if (users[0].count > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete organization with existing users. Remove users first.'
      });
    }
    
    const [result] = await pool.query(
      'DELETE FROM organizations WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Organization deleted successfully'
    });
  } catch (error) {
    console.error('Delete organization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete organization'
    });
  }
}

module.exports = {
  createOrganization,
  getAllOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization
};
