const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth.middleware');

// Register new user (disabled - only admin can create users)
async function register(req, res) {
  try {
    return res.status(403).json({
      success: false,
      message: 'Self-registration is disabled. Please contact your administrator to create an account.',
      note: 'Only administrators can create new users and organizations',
      admin_contact: 'Use admin credentials to access user management endpoints'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing registration',
      error: error.message
    });
  }
}

// Login user
async function login(req, res) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }
    
    const pool = getPool();
    
    // Get user with organization info
    const [users] = await pool.query(
      `SELECT u.*, o.name as organization_name, o.is_active as organization_active
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       WHERE u.email = ?`,
      [email]
    );
    
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    const user = users[0];
    
    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'User account is inactive'
      });
    }
    
    // Check if organization is active
    if (!user.organization_active) {
      return res.status(403).json({
        success: false,
        error: 'Organization is inactive'
      });
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        organization_id: user.organization_id,
        organization_name: user.organization_name,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
}

// Get current user profile
async function getProfile(req, res) {
  try {
    res.status(200).json({
      success: true,
      data: req.user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting profile',
      error: error.message
    });
  }
}

// Update user profile
async function updateProfile(req, res) {
  try {
    const { name, phoneNumber, currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    const pool = getPool();
    
    const updates = [];
    const values = [];
    
    // Update name
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    
    // Update phone number
    if (phoneNumber !== undefined) {
      updates.push('phone_number = ?');
      values.push(phoneNumber);
    }
    
    // Update password if provided
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set new password'
        });
      }
      
      // Verify current password
      const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
      const validPassword = await bcrypt.compare(currentPassword, users[0].password);
      
      if (!validPassword) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);
    
    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await pool.query(updateQuery, values);
    
    // Get updated user
    const [updated] = await pool.query(
      'SELECT id, name, email, phone_number FROM users WHERE id = ?',
      [userId]
    );
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updated[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};
