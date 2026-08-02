const express = require('express');
const {
  getExamReport,
  getCandidateReport,
  getDepartmentReport,
  exportExamExcel,
  downloadResultPDF,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /api/reports/exams/{examId}:
 *   get:
 *     summary: Retrieve aggregate reports for a specific exam
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/exams/:examId', authorize('admin', 'superadmin'), getExamReport);

/**
 * @swagger
 * /api/reports/candidate/{candidateId}/exam/{examId}:
 *   get:
 *     summary: Retrieve candidate result details and proctor log history timeline
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/candidate/:candidateId/exam/:examId', getCandidateReport);

/**
 * @swagger
 * /api/reports/departments:
 *   get:
 *     summary: Retrieve average scores per department
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/departments', authorize('admin', 'superadmin'), getDepartmentReport);

/**
 * @swagger
 * /api/reports/exams/{examId}/export-excel:
 *   get:
 *     summary: Download excel report sheet for all participants of an exam
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/exams/:examId/export-excel', authorize('admin', 'superadmin'), exportExamExcel);

/**
 * @swagger
 * /api/reports/results/{resultId}/download-pdf:
 *   get:
 *     summary: Download performance certificate in PDF format
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/results/:resultId/download-pdf', downloadResultPDF);

module.exports = router;
