const express = require('express');
const {
  getAssignedExams,
  startExam,
  submitExam,
  getCandidateResults,
  runCodingTest,
  getRound1,
  submitRound1,
  getRound2,
  submitRound2,
  getRound3,
  saveRound3Edits,
  submitRound3,
  getFinalResult,
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

// Round based routes
router.get('/exams/:id/round/1', getRound1);
router.post('/exams/:id/round/1/submit', submitRound1);
router.get('/exams/:id/round/2', getRound2);
router.post('/exams/:id/round/2/submit', submitRound2);
router.get('/exams/:id/round/3', getRound3);
router.post('/exams/:id/round/3/save', saveRound3Edits);
router.post('/exams/:id/round/3/submit', submitRound3);
router.get('/exams/:id/final-result', getFinalResult);

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
