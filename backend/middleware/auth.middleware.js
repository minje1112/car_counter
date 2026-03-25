const jwt = require('jsonwebtoken');
const { getPool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Middleware to verify JWT token
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required. Please login.'
      });
    }
    
    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }
      
      // Get user from database with organization and role
      const pool = getPool();
      const [users] = await pool.query(
        `SELECT u.id, u.organization_id, u.name, u.email, u.phone_number, u.role, u.is_active,
                o.name as organization_name, o.is_active as organization_active
         FROM users u
         JOIN organizations o ON u.organization_id = o.id
         WHERE u.id = ?`,
        [decoded.userId]
      );
      
      if (users.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'User not found'
        });
      }
      
      const user = users[0];
      
      // Check if user and organization are active
      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: 'User account is inactive'
        });
      }
      
      if (!user.organization_active) {
        return res.status(403).json({
          success: false,
          message: 'Organization is inactive'
        });
      }
      
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message
    });
  }
}

// Optional auth - doesn't fail if no token
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      req.user = null;
      return next();
    }
    
    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        req.user = null;
        return next();
      }
      
      const pool = getPool();
      const [users] = await pool.query(
        `SELECT u.id, u.organization_id, u.name, u.email, u.phone_number, u.role, u.is_active,
                o.name as organization_name
         FROM users u
         JOIN organizations o ON u.organization_id = o.id
         WHERE u.id = ? AND u.is_active = TRUE AND o.is_active = TRUE`,
        [decoded.userId]
      );
      
      req.user = users.length > 0 ? users[0] : null;
      next();
    });
  } catch (error) {
    req.user = null;
    next();
  }
}

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  
  next();
}

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  JWT_SECRET
};
