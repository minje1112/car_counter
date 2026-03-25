const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const {
  startAIJob,
  stopAIJob,
  restartAIJob,
  getAIJobStatus,
  getAllAIJobsStatus,
  getCarCountStats
} = require('../controllers/ai.controller');

/**
 * @swagger
 * tags:
 *   name: AI Jobs
 *   description: AI car counting job management - Start, stop, and monitor AI-powered vehicle detection on RTSP streams
 */

/**
 * @swagger
 * /api/ai/streams/{id}/start:
 *   post:
 *     summary: Start AI car counting for a stream
 *     description: Starts an AI job that counts vehicles from an RTSP stream at regular intervals using YOLOv8 model
 *     tags: [AI Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stream ID
 *         example: 1
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               interval:
 *                 type: integer
 *                 description: Counting interval in seconds (default 60)
 *                 example: 60
 *                 minimum: 30
 *                 maximum: 3600
 *     responses:
 *       200:
 *         description: AI job started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'AI car counting started'
 *                 data:
 *                   type: object
 *                   properties:
 *                     streamId:
 *                       type: integer
 *                       example: 1
 *                     streamName:
 *                       type: string
 *                       example: 'Main Entrance'
 *                     interval:
 *                       type: integer
 *                       example: 60
 *                     jobId:
 *                       type: string
 *                       example: 'stream-1'
 *                     status:
 *                       type: string
 *                       example: 'active'
 *       400:
 *         description: Job already running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: 'AI job already running for this stream'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Stream not found
 *       500:
 *         description: Server error
 */
router.post('/streams/:id/start', authenticateToken, startAIJob);

/**
 * @swagger
 * /api/ai/streams/{id}/stop:
 *   post:
 *     summary: Stop AI car counting for a stream
 *     description: Stops the AI counting job for a specific stream and removes it from the queue
 *     tags: [AI Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stream ID
 *         example: 1
 *     responses:
 *       200:
 *         description: AI job stopped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'AI car counting stopped'
 *                 data:
 *                   type: object
 *                   properties:
 *                     streamId:
 *                       type: integer
 *                       example: 1
 *                     status:
 *                       type: string
 *                       example: 'inactive'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Stream not found
 *       500:
 *         description: Server error
 */
router.post('/streams/:id/stop', authenticateToken, stopAIJob);

/**
 * @swagger
 * /api/ai/streams/{id}/restart:
 *   post:
 *     summary: Restart AI car counting for a stream
 *     description: Stops and restarts the AI counting job with a new interval
 *     tags: [AI Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stream ID
 *         example: 1
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               interval:
 *                 type: integer
 *                 description: New counting interval in seconds
 *                 example: 30
 *                 minimum: 30
 *                 maximum: 3600
 *     responses:
 *       200:
 *         description: AI job restarted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'AI car counting restarted'
 *                 data:
 *                   type: object
 *                   properties:
 *                     streamId:
 *                       type: integer
 *                       example: 1
 *                     streamName:
 *                       type: string
 *                       example: 'Main Entrance'
 *                     interval:
 *                       type: integer
 *                       example: 30
 *                     jobId:
 *                       type: string
 *                       example: 'stream-1'
 *                     status:
 *                       type: string
 *                       example: 'active'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Stream not found
 *       500:
 *         description: Server error
 */
router.post('/streams/:id/restart', authenticateToken, restartAIJob);

/**
 * @swagger
 * /api/ai/streams/status:
 *   get:
 *     summary: Get all AI jobs status
 *     description: Retrieves the status of all AI counting jobs for all streams in the organization
 *     tags: [AI Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All AI jobs status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AIJobStatus'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/streams/status', authenticateToken, getAllAIJobsStatus);

/**
 * @swagger
 * /api/ai/streams/{id}/status:
 *   get:
 *     summary: Get AI job status for a stream
 *     description: Retrieves detailed status information for a specific stream's AI counting job, including recent counts
 *     tags: [AI Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stream ID
 *         example: 1
 *     responses:
 *       200:
 *         description: AI job status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/AIJobStatus'
 *                     - type: object
 *                       properties:
 *                         recentCounts:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/CarCount'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Stream not found
 *       500:
 *         description: Server error
 */
router.get('/streams/:id/status', authenticateToken, getAIJobStatus);

/**
 * @swagger
 * /api/ai/streams/{id}/stats:
 *   get:
 *     summary: Get car count statistics for a stream
 *     description: Retrieves aggregated statistics and historical car count data for a specific stream with optional date filtering
 *     tags: [AI Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stream ID
 *         example: 1
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for statistics (ISO 8601 format)
 *         example: '2026-01-01T00:00:00Z'
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for statistics (ISO 8601 format)
 *         example: '2026-01-23T23:59:59Z'
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *           minimum: 1
 *           maximum: 1000
 *         description: Maximum number of records to return
 *         example: 100
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     streamId:
 *                       type: integer
 *                       example: 1
 *                     streamName:
 *                       type: string
 *                       example: 'Main Entrance'
 *                     statistics:
 *                       $ref: '#/components/schemas/CarCountStats'
 *                     records:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CarCount'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Stream not found
 *       500:
 *         description: Server error
 */
router.get('/streams/:id/stats', authenticateToken, getCarCountStats);

module.exports = router;

