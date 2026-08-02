const express = require('express');
const {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam,
  createQuestion,
  getQuestions,
  updateQuestion,
  deleteQuestion,
  importQuestionsExcel,
  importQuestionsPDF,
} = require('../controllers/examController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Apply auth protection to all exam/question routes
router.use(protect);

// ==========================================
// EXAMS ROUTES
// ==========================================

router.route('/')
  .get(getExams)
  .post(authorize('admin', 'superadmin'), createExam);

router.route('/:id')
  .get(getExamById)
  .put(authorize('admin', 'superadmin'), updateExam)
  .delete(authorize('admin', 'superadmin'), deleteExam);

// ==========================================
// QUESTIONS ROUTES
// ==========================================

router.route('/questions/all')
  .get(authorize('admin', 'superadmin'), getQuestions)
  .post(authorize('admin', 'superadmin'), createQuestion);

router.route('/questions/all/:id')
  .put(authorize('admin', 'superadmin'), updateQuestion)
  .delete(authorize('admin', 'superadmin'), deleteQuestion);

router.post('/questions/import-excel', authorize('admin', 'superadmin'), upload.single('excel'), importQuestionsExcel);
router.post('/questions/import-pdf', authorize('admin', 'superadmin'), upload.single('pdf'), importQuestionsPDF);

module.exports = router;
