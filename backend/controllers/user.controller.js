const bcrypt = require('bcryptjs');
const { getPool } = require('../config/database');

// Admin: Create user in organization
async function createUserByAdmin(req, res) {
  try {
    const { organization_id, name, email, password, phone_number, role } = req.body;
    
    // Validate required fields
    if (!organization_id || !name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID, name, email and password are required'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }
    
    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }
    
    // Validate role
    const userRole = role || 'user';
    if (!['admin', 'user'].includes(userRole)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be "admin" or "user"'
      });
    }
    
    const pool = getPool();
    
    // Check if organization exists
    const [orgs] = await pool.query(
      'SELECT id, is_active FROM organizations WHERE id = ?',
      [organization_id]
    );
    
    if (orgs.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }
    
    if (!orgs[0].is_active) {
      return res.status(400).json({
        success: false,
        error: 'Organization is inactive'
      });
    }
    
    // Check if email already exists
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const [result] = await pool.query(
      'INSERT INTO users (organization_id, name, email, password, phone_number, role) VALUES (?, ?, ?, ?, ?, ?)',
      [organization_id, name, email, hashedPassword, phone_number || null, userRole]
    );
    
    const [users] = await pool.query(
      `SELECT u.id, u.organization_id, u.name, u.email, u.phone_number, u.role, u.is_active,
              u.created_at, o.name as organization_name
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = ?`,
      [result.insertId]
    );
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: users[0]
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
}

// Admin: Get all users (all orgs) or User: Get users in same organization
async function getAllUsers(req, res) {
  try {
    const pool = getPool();
    let query;
    let params = [];
    
    if (req.user.role === 'admin') {
      // Admin can see all users
      query = `
        SELECT u.id, u.organization_id, u.name, u.email, u.phone_number, u.role, u.is_active,
               u.created_at, o.name as organization_name
        FROM users u
        JOIN organizations o ON u.organization_id = o.id
        ORDER BY u.created_at DESC
      `;
    } else {
      // Regular users can only see users in their organization
      query = `
        SELECT u.id, u.organization_id, u.name, u.email, u.phone_number, u.role, u.is_active,
               u.created_at, o.name as organization_name
        FROM users u
        JOIN organizations o ON u.organization_id = o.id
        WHERE u.organization_id = ?
        ORDER BY u.created_at DESC
      `;
      params = [req.user.organization_id];
    }
    
    const [users] = await pool.query(query, params);
    
    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
}

// Get user by ID
async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    const [users] = await pool.query(
      `SELECT u.id, u.organization_id, u.name, u.email, u.phone_number, u.role, u.is_active,
              u.created_at, u.updated_at, o.name as organization_name
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = ?`,
      [id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = users[0];
    
    // Check access: admin can see all, users can only see same org
    if (req.user.role !== 'admin' && user.organization_id !== req.user.organization_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
}

// Admin: Update user
async function updateUserByAdmin(req, res) {
  try {
    const { id } = req.params;
    const { name, phone_number, role, is_active, organization_id } = req.body;
    
    const pool = getPool();
    
    // Get current user data
    const [currentUsers] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    
    if (currentUsers.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const updates = [];
    const values = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (phone_number !== undefined) {
      updates.push('phone_number = ?');
      values.push(phone_number);
    }
    if (role !== undefined && ['admin', 'user'].includes(role)) {
      updates.push('role = ?');
      values.push(role);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active);
    }
    if (organization_id !== undefined) {
      // Verify organization exists
      const [orgs] = await pool.query(
        'SELECT id FROM organizations WHERE id = ?',
        [organization_id]
      );
      if (orgs.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Organization not found'
        });
      }
      updates.push('organization_id = ?');
      values.push(organization_id);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No update data provided'
      });
    }
    
    values.push(id);
    
    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    const [users] = await pool.query(
      `SELECT u.id, u.organization_id, u.name, u.email, u.phone_number, u.role, u.is_active,
              u.created_at, u.updated_at, o.name as organization_name
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = ?`,
      [id]
    );
    
    res.json({
      success: true,
      message: 'User updated successfully',
      user: users[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
}

// Admin: Delete user
async function deleteUserByAdmin(req, res) {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    // Prevent deleting self
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }
    
    const [result] = await pool.query(
      'DELETE FROM users WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
}

module.exports = {
  createUserByAdmin,
  getAllUsers,
  getUserById,
  updateUserByAdmin,
  deleteUserByAdmin
};
