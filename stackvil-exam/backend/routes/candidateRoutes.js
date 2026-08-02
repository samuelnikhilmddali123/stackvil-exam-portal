const express = require('express');
const {
  getAssignedExams,
  startExam,
  submitExam,
  getCandidateResults,
  runCodingTest,
} = require('../controllers/candidateController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply candidate access checks
router.use(protect);
router.use(authorize('candidate', 'admin', 'superadmin')); // Admin can view too

/**
 * @swagger
 * /api/candidate/exams:
 *   get:
 *     summary: Retrieve assigned exams list
 *     tags: [Candidate]
 *     security:
 *       - bearerAuth: []
 */
router.get('/exams', getAssignedExams);

/**
 * @swagger
 * /api/candidate/exams/{id}/start:
 *   get:
 *     summary: Initialize exam session (fetch stripped questions)
 *     tags: [Candidate]
 *     security:
 *       - bearerAuth: []
 */
router.get('/exams/:id/start', startExam);

/**
 * @swagger
 * /api/candidate/exams/{id}/submit:
 *   post:
 *     summary: Finalize and grade completed exam
 *     tags: [Candidate]
 *     security:
 *       - bearerAuth: []
 */
router.post('/exams/:id/submit', submitExam);
router.post('/exams/:id/run-code', runCodingTest);

/**
 * @swagger
 * /api/candidate/results:
 *   get:
 *     summary: Retrieve student result sheets list
 *     tags: [Candidate]
 *     security:
 *       - bearerAuth: []
 */
router.get('/results', getCandidateResults);

module.exports = router;
