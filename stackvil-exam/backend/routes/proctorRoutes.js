const express = require('express');
const { logWarning, uploadFrame, getProctorLogs } = require('../controllers/proctorController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /api/proctor/log-warning:
 *   post:
 *     summary: Log a cheating attempt or layout violation with image snapshot
 *     tags: [Proctoring]
 *     security:
 *       - bearerAuth: []
 */
router.post('/log-warning', upload.single('proctorImage'), logWarning);

/**
 * @swagger
 * /api/proctor/upload-frame:
 *   post:
 *     summary: Upload periodic proctor screen capture
 *     tags: [Proctoring]
 *     security:
 *       - bearerAuth: []
 */
router.post('/upload-frame', upload.single('proctorImage'), uploadFrame);

/**
 * @swagger
 * /api/proctor/logs/{examId}/{candidateId}:
 *   get:
 *     summary: Retrieve proctor logs for review
 *     tags: [Proctoring]
 *     security:
 *       - bearerAuth: []
 */
router.get('/logs/:examId/:candidateId', authorize('admin', 'superadmin'), getProctorLogs);

module.exports = router;
