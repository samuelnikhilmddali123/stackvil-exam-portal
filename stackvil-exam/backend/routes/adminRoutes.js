const express = require('express');
const {
  getDashboardStats,
  getCandidates,
  addCandidate,
  updateCandidate,
  deleteCandidate,
  importCandidates,
  exportCandidates,
  getSettings,
  updateSettings,
  createCustomCandidateExam,
  scheduleCandidateExam,
  forceSubmitCandidateExam,
  resetDatabase,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Apply protect & role-based restrictions to all admin endpoints
router.use(protect);
router.use(authorize('admin', 'superadmin'));

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Retrieve dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/dashboard', getDashboardStats);

/**
 * @swagger
 * /api/admin/candidates:
 *   get:
 *     summary: Retrieve list of candidates
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *   post:
 *     summary: Add a candidate manually
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.route('/candidates')
  .get(getCandidates)
  .post(addCandidate);

/**
 * @swagger
 * /api/admin/candidates/{id}:
 *   put:
 *     summary: Update candidate
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *   delete:
 *     summary: Delete candidate
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.route('/candidates/:id')
  .put(updateCandidate)
  .delete(deleteCandidate);

router.post('/candidates/:id/create-custom-exam', upload.fields([
  { name: 'aptitudePdf', maxCount: 1 },
  { name: 'technicalPdf', maxCount: 1 }
]), createCustomCandidateExam);

router.put('/exams/:examId/schedule', scheduleCandidateExam);
router.post('/exams/:examId/force-submit', forceSubmitCandidateExam);

/**
 * @swagger
 * /api/admin/candidates/import:
 *   post:
 *     summary: Import candidates in bulk via Excel sheet upload
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.post('/candidates/import', upload.single('excel'), importCandidates);

/**
 * @swagger
 * /api/admin/candidates/export:
 *   get:
 *     summary: Export candidate list to Excel file
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/candidates/export', exportCandidates);

/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     summary: Retrieve configuration settings
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *   put:
 *     summary: Update portal configurations
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.route('/settings')
  .get(getSettings)
  .put(upload.single('logo'), updateSettings);

router.post('/reset-database', resetDatabase);

module.exports = router;
