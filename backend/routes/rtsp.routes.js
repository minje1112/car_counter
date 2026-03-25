const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/rtsp.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

/**
 * @swagger
 * /api/rtsp/streams:
 *   post:
 *     summary: Add a new RTSP camera stream
 *     tags: [RTSP]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stream_name
 *               - rtsp_url
 *             properties:
 *               stream_name:
 *                 type: string
 *                 example: Front Door Camera
 *               rtsp_url:
 *                 type: string
 *                 example: rtsp://192.168.1.100:554/stream
 *               description:
 *                 type: string
 *                 example: Main entrance camera
 *               grid_position:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: RTSP stream added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 stream:
 *                   $ref: '#/components/schemas/RtspStream'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/rtsp/streams', authenticateToken, addRtspStream);

/**
 * @swagger
 * /api/rtsp/streams:
 *   get:
 *     summary: Get all RTSP streams
 *     tags: [RTSP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of RTSP streams
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 streams:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RtspStream'
 *       401:
 *         description: Unauthorized
 */
router.get('/rtsp/streams', authenticateToken, getAllRtspStreams);

/**
 * @swagger
 * /api/rtsp/streams/{id}:
 *   get:
 *     summary: Get RTSP stream by ID
 *     tags: [RTSP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stream ID
 *     responses:
 *       200:
 *         description: Stream details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stream:
 *                   $ref: '#/components/schemas/RtspStream'
 *       404:
 *         description: Stream not found
 *       401:
 *         description: Unauthorized
 */
router.get('/rtsp/streams/:id', authenticateToken, getRtspStreamById);

/**
 * @swagger
 * /api/rtsp/streams/{id}:
 *   put:
 *     summary: Update RTSP stream
 *     tags: [RTSP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stream ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stream_name:
 *                 type: string
 *               rtsp_url:
 *                 type: string
 *               description:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *               grid_position:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Stream updated successfully
 *       404:
 *         description: Stream not found
 *       401:
 *         description: Unauthorized
 */
router.put('/rtsp/streams/:id', authenticateToken, updateRtspStream);

/**
 * @swagger
 * /api/rtsp/streams/{id}/annotation:
 *   put:
 *     summary: Assign annotation rules to RTSP stream for car counting
 *     tags: [RTSP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stream ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               annotationId:
 *                 type: integer
 *                 nullable: true
 *                 description: Annotation ID to assign (null to remove)
 *                 example: 1
 *     responses:
 *       200:
 *         description: Annotation assigned successfully
 *       404:
 *         description: Stream or annotation not found
 *       401:
 *         description: Unauthorized
 */
router.put('/rtsp/streams/:id/annotation', authenticateToken, assignAnnotation);

/**
 * @swagger
 * /api/rtsp/streams/{id}:
 *   delete:
 *     summary: Delete RTSP stream and all associated clips
 *     tags: [RTSP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stream ID
 *     responses:
 *       200:
 *         description: Stream deleted successfully
 *       404:
 *         description: Stream not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/rtsp/streams/:id', authenticateToken, deleteRtspStream);

/**
 * @swagger
 * /api/rtsp/streams/{id}/snapshot:
 *   post:
 *     summary: Capture snapshot from RTSP stream
 *     description: Requires ffmpeg to be installed. Captures a single frame from the live stream
 *     tags: [RTSP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stream ID
 *     responses:
 *       201:
 *         description: Snapshot captured successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 clip:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     stream_id:
 *                       type: integer
 *                     clip_type:
 *                       type: string
 *                       example: snapshot
 *                     file_path:
 *                       type: string
 *                     file_url:
 *                       type: string
 *       404:
 *         description: Stream not found
 *       500:
 *         description: Error capturing snapshot (ffmpeg required)
 *       401:
 *         description: Unauthorized
 */
router.post('/rtsp/streams/:id/snapshot', authenticateToken, captureSnapshot);

/**
 * @swagger
 * /api/rtsp/streams/{id}/clip:
 *   post:
 *     summary: Capture video clip from RTSP stream
 *     description: Requires ffmpeg to be installed. Records a video clip of specified duration
 *     tags: [RTSP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stream ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               duration:
 *                 type: integer
 *                 default: 10
 *                 example: 10
 *                 description: Duration in seconds (default 10)
 *     responses:
 *       201:
 *         description: Video clip captured successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 clip:
 *                   type: object
 *       404:
 *         description: Stream not found
 *       500:
 *         description: Error capturing video (ffmpeg required)
 *       401:
 *         description: Unauthorized
 */
router.post('/rtsp/streams/:id/clip', authenticateToken, captureVideoClip);

/**
 * @swagger
 * /api/rtsp/streams/{id}/clips:
 *   get:
 *     summary: Get all clips for a specific stream
 *     tags: [RTSP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stream ID
 *       - in: query
 *         name: clip_type
 *         schema:
 *           type: string
 *           enum: [snapshot, video]
 *         description: Filter by clip type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of clips to return
 *     responses:
 *       200:
 *         description: List of clips
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 clips:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: Stream not found
 *       401:
 *         description: Unauthorized
 */
router.get('/rtsp/streams/:id/clips', authenticateToken, getStreamClips);

/**
 * @swagger
 * /api/rtsp/snapshots:
 *   get:
 *     summary: Get all snapshots from all streams
 *     tags: [RTSP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of snapshots
 *     responses:
 *       200:
 *         description: List of all snapshots
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 snapshots:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/rtsp/snapshots', authenticateToken, getAllSnapshots);

/**
 * @swagger
 * /api/rtsp/snapshots/latest:
 *   get:
 *     summary: Get latest snapshot per stream (for grid display)
 *     description: Returns the most recent snapshot for each active stream, ideal for displaying in a grid view
 *     tags: [RTSP]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Latest snapshot for each stream
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 streams:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       stream_id:
 *                         type: integer
 *                       stream_name:
 *                         type: string
 *                       latest_snapshot:
 *                         type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/rtsp/snapshots/latest', authenticateToken, getLatestSnapshotsPerStream);

module.exports = router;
