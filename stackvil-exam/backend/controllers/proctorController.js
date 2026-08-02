const ProctorLog = require('../models/ProctorLog');
const Result = require('../models/Result');
const Exam = require('../models/Exam');
const fs = require('fs');

/**
 * @desc    Log a proctoring warning/violation
 * @route   POST /api/proctor/log-warning
 * @access  Private (Candidate)
 */
const logWarning = async (req, res, next) => {
  try {
    const { examId, type } = req.body;
    const userId = req.user.id;

    if (!examId || !type) {
      return res.status(400).json({ success: false, message: 'Please provide exam ID and warning type' });
    }

    // Find or create proctor log for this exam session
    let proctorLog = await ProctorLog.findOne({ candidate: userId, exam: examId });
    if (!proctorLog) {
      proctorLog = new ProctorLog({
        candidate: userId,
        exam: examId,
        logs: [],
      });
    }

    // Filter to count warning-based violations (e.g. not periodic images)
    const activeWarnings = proctorLog.logs.filter((l) => 
      l.type !== 'PeriodicCapture' && l.warningNumber !== undefined
    );
    const nextWarningNumber = activeWarnings.length + 1;

    // Build the log item
    const newLogItem = {
      type,
      timestamp: Date.now(),
      imagePath: req.file ? `/uploads/proctor/${req.file.filename}` : undefined,
      warningNumber: nextWarningNumber,
    };

    proctorLog.logs.push(newLogItem);
    await proctorLog.save();

    res.status(200).json({
      success: true,
      message: `Violation recorded: ${type}`,
      warningCount: nextWarningNumber,
      warningsRemaining: Math.max(0, 5 - nextWarningNumber),
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

/**
 * @desc    Periodic capture uploads
 * @route   POST /api/proctor/upload-frame
 * @access  Private (Candidate)
 */
const uploadFrame = async (req, res, next) => {
  try {
    const { examId } = req.body;
    const userId = req.user.id;

    if (!examId) {
      return res.status(400).json({ success: false, message: 'Please specify the exam ID' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No frame uploaded' });
    }

    let proctorLog = await ProctorLog.findOne({ candidate: userId, exam: examId });
    if (!proctorLog) {
      proctorLog = new ProctorLog({
        candidate: userId,
        exam: examId,
        logs: [],
      });
    }

    proctorLog.logs.push({
      type: 'FaceNotDetected', // Trigger default types in validation loop or generic capture representation
      timestamp: Date.now(),
      imagePath: `/uploads/proctor/${req.file.filename}`,
    });

    await proctorLog.save();

    res.status(200).json({
      success: true,
      message: 'Frame uploaded and registered',
      imagePath: `/uploads/proctor/${req.file.filename}`,
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

/**
 * @desc    Retrieve logs for an exam session
 * @route   GET /api/proctor/logs/:examId/:candidateId
 * @access  Private (Admin/Superadmin)
 */
const getProctorLogs = async (req, res, next) => {
  try {
    const { examId, candidateId } = req.params;

    const log = await ProctorLog.findOne({ candidate: candidateId, exam: examId })
      .populate('candidate', 'name email department')
      .populate('exam', 'title duration');

    if (!log) {
      return res.status(200).json({ success: true, count: 0, logs: [] });
    }

    res.status(200).json({ success: true, count: log.logs.length, log });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  logWarning,
  uploadFrame,
  getProctorLogs,
};
