const express = require('express');
const router = express.Router();
const {
  createAnnotation,
  getAllAnnotations,
  getAnnotationById,
  updateAnnotation,
  deleteAnnotation
} = require('../controllers/annotation.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

/**
 * @swagger
 * /api/annotations:
 *   post:
 *     summary: Create a new annotation
 *     tags: [Annotations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - location
 *               - imageUrl
 *               - annotations
 *             properties:
 *               location:
 *                 type: string
 *                 example: "Draw Detection"
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/image.jpg"
 *               annotations:
 *                 type: object
 *                 example: {"shapes": {"Polygon": [{"id": "1", "points": [[0.1, 0.2], [0.3, 0.4]], "color": "red"}]}}
 *     responses:
 *       201:
 *         description: Annotation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Annotation'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/annotations', authenticateToken, createAnnotation);

/**
 * @swagger
 * /api/annotations:
 *   get:
 *     summary: Get all annotations
 *     tags: [Annotations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all annotations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Annotation'
 *       401:
 *         description: Unauthorized
 */
router.get('/annotations', authenticateToken, getAllAnnotations);

/**
 * @swagger
 * /api/annotations/{id}:
 *   get:
 *     summary: Get annotation by ID
 *     tags: [Annotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Annotation ID
 *     responses:
 *       200:
 *         description: Annotation details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Annotation'
 *       404:
 *         description: Annotation not found
 *       401:
 *         description: Unauthorized
 */
router.get('/annotations/:id', authenticateToken, getAnnotationById);

/**
 * @swagger
 * /api/annotations/{id}:
 *   put:
 *     summary: Update an annotation
 *     tags: [Annotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Annotation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               location:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               annotations:
 *                 type: object
 *     responses:
 *       200:
 *         description: Annotation updated successfully
 *       404:
 *         description: Annotation not found
 *       401:
 *         description: Unauthorized
 */
router.put('/annotations/:id', authenticateToken, updateAnnotation);

/**
 * @swagger
 * /api/annotations/{id}:
 *   delete:
 *     summary: Delete an annotation
 *     tags: [Annotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Annotation ID
 *     responses:
 *       200:
 *         description: Annotation deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Annotation not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/annotations/:id', authenticateToken, deleteAnnotation);

module.exports = router;

