const { getPool } = require('../config/database');

// Get all system configuration
async function getAllConfig(req, res) {
  try {
    const pool = getPool();
    const query = 'SELECT * FROM system_config ORDER BY config_key';
    const [rows] = await pool.query(query);
    
    // Convert to key-value object
    const config = {};
    rows.forEach(row => {
      let value = row.config_value;
      
      // Try to parse as number or boolean
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(value)) value = Number(value);
      
      config[row.config_key] = {
        value: value,
        description: row.description,
        updated_at: row.updated_at
      };
    });
    
    res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching configuration',
      error: error.message
    });
  }
}

// Get single config value
async function getConfigByKey(req, res) {
  try {
    const { key } = req.params;
    const pool = getPool();
    
    const query = 'SELECT * FROM system_config WHERE config_key = ?';
    const [rows] = await pool.query(query, [key]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Configuration key not found'
      });
    }
    
    let value = rows[0].config_value;
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (!isNaN(value)) value = Number(value);
    
    res.status(200).json({
      success: true,
      data: {
        key: rows[0].config_key,
        value: value,
        description: rows[0].description,
        updated_at: rows[0].updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching configuration',
      error: error.message
    });
  }
}

// Update configuration value
async function updateConfig(req, res) {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Value is required'
      });
    }
    
    const pool = getPool();
    
    // Convert value to string for storage
    const stringValue = String(value);
    
    const updates = ['config_value = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const values = [stringValue];
    
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    
    values.push(key);
    
    const updateQuery = `
      UPDATE system_config 
      SET ${updates.join(', ')} 
      WHERE config_key = ?
    `;
    
    const [result] = await pool.query(updateQuery, values);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Configuration key not found'
      });
    }
    
    const [updated] = await pool.query('SELECT * FROM system_config WHERE config_key = ?', [key]);
    
    res.status(200).json({
      success: true,
      message: 'Configuration updated successfully',
      data: {
        key: updated[0].config_key,
        value: updated[0].config_value,
        description: updated[0].description
      }
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating configuration',
      error: error.message
    });
  }
}

// Batch update multiple config values
async function batchUpdateConfig(req, res) {
  try {
    const { configs } = req.body;
    console.log(configs)
    if (!configs || typeof configs !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Configs object is required'
      });
    }
    
    const pool = getPool();
    const updates = [];
    
    for (const [key, value] of Object.entries(configs)) {
      const stringValue = String(value);
      await pool.query(
        'UPDATE system_config SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = ?',
        [stringValue, key]
      );
      updates.push(key);
    }
    
    res.status(200).json({
      success: true,
      message: `${updates.length} configuration values updated successfully`,
      updated: updates
    });
  } catch (error) {
    console.error('Error batch updating config:', error);
    res.status(500).json({
      success: false,
      message: 'Error batch updating configuration',
      error: error.message
    });
  }
}

// Create new config key
async function createConfig(req, res) {
  try {
    const { key, value, description } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Key and value are required'
      });
    }
    
    const pool = getPool();
    const stringValue = String(value);
    
    const query = `
      INSERT INTO system_config (config_key, config_value, description)
      VALUES (?, ?, ?)
    `;
    
    const [result] = await pool.query(query, [key, stringValue, description]);
    
    res.status(201).json({
      success: true,
      message: 'Configuration created successfully',
      data: {
        id: result.insertId,
        key,
        value: stringValue,
        description
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Configuration key already exists'
      });
    }
    
    console.error('Error creating config:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating configuration',
      error: error.message
    });
  }
}

module.exports = {
  getAllConfig,
  getConfigByKey,
  updateConfig,
  batchUpdateConfig,
  createConfig
};
