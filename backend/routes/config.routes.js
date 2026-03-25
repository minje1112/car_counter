const express = require('express');
const router = express.Router();
const {
  getAllConfig,
  getConfigByKey,
  updateConfig,
  batchUpdateConfig,
  createConfig
} = require('../controllers/config.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

/**
 * @swagger
 * /api/config:
 *   get:
 *     summary: Get all system configuration settings
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all configuration settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 config:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Config'
 *       401:
 *         description: Unauthorized
 */
router.get('/config', authenticateToken, getAllConfig);

/**
 * @swagger
 * /api/config/{key}:
 *   get:
 *     summary: Get configuration value by key
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Configuration key
 *         example: max_files
 *     responses:
 *       200:
 *         description: Configuration value
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 config:
 *                   $ref: '#/components/schemas/Config'
 *       404:
 *         description: Configuration key not found
 *       401:
 *         description: Unauthorized
 */
router.get('/config/:key', authenticateToken, getConfigByKey);

/**
 * @swagger
 * /api/config:
 *   post:
 *     summary: Create a new configuration setting
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - config_key
 *               - config_value
 *             properties:
 *               config_key:
 *                 type: string
 *                 example: new_setting
 *               config_value:
 *                 type: string
 *                 example: "100"
 *               description:
 *                 type: string
 *                 example: Description of the setting
 *     responses:
 *       201:
 *         description: Configuration created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 config:
 *                   $ref: '#/components/schemas/Config'
 *       400:
 *         description: Configuration key already exists or validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/config', authenticateToken, createConfig);

/**
 * @swagger
 * /api/config/batch:
 *   put:
 *     summary: Update multiple configuration settings at once
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - configs
 *             properties:
 *               configs:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *                 example:
 *                   max_files: "50"
 *                   grid_rows: "5"
 *                   grid_columns: "5"
 *                   video_clip_duration: "15"
 *     responses:
 *       200:
 *         description: Configurations updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 updated_count:
 *                   type: integer
 *                 configs:
 *                   type: object
 *       400:
 *         description: Invalid request format
 *       401:
 *         description: Unauthorized
 */
router.put('/config/batch', authenticateToken, batchUpdateConfig);

/**
 * @swagger
 * /api/config/{key}:
 *   put:
 *     summary: Update a configuration setting
 *     tags: [Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Configuration key to update
 *         example: max_files
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - config_value
 *             properties:
 *               config_value:
 *                 type: string
 *                 example: "50"
 *               description:
 *                 type: string
 *                 example: Updated description
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 config:
 *                   $ref: '#/components/schemas/Config'
 *       404:
 *         description: Configuration key not found
 *       401:
 *         description: Unauthorized
 */
router.put('/config/:key', authenticateToken, updateConfig);

module.exports = router;
