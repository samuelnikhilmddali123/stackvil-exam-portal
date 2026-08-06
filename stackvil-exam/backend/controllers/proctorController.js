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

    // Sync warnings count in the Result collection in real-time (if Result exists)
    await Result.updateOne(
      { candidate: userId, exam: examId },
      { $set: { warningsCount: nextWarningNumber } }
    );

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

/**
 * @desc    Get all currently active proctoring sessions (live exam takers)
 * @route   GET /api/proctor/live
 * @access  Private (Admin/Superadmin)
 */
const getLiveProctorSessions = async (req, res, next) => {
  try {
    // 1. Fetch all proctor logs populated with candidate and exam info
    const logs = await ProctorLog.find()
      .populate('candidate', 'name email department')
      .populate('exam', 'title duration');

    const liveSessions = [];

    for (const log of logs) {
      if (!log.candidate || !log.exam) continue;

      // 2. Check if a corresponding Result exists
      const hasResult = await Result.exists({ candidate: log.candidate._id, exam: log.exam._id });
      if (hasResult) continue; // Already submitted, not active

      // 3. Verify if the candidate has recent activity (within last 3 minutes)
      const logsArray = log.logs || [];
      if (logsArray.length === 0) continue;

      const lastLog = logsArray[logsArray.length - 1];
      const timeSinceLastActivity = Date.now() - new Date(lastLog.timestamp).getTime();
      const isActive = timeSinceLastActivity < 3 * 60 * 1000; // 3 minutes window

      if (isActive) {
        // Find latest log item with an image (periodic capture or violation)
        const logsWithImage = logsArray.filter(l => l.imagePath);
        const latestImageLog = logsWithImage.length > 0 ? logsWithImage[logsWithImage.length - 1] : null;

        // Count warnings
        const warnings = logsArray.filter((l) => 
          l.type !== 'PeriodicCapture' && l.warningNumber !== undefined
        );

        liveSessions.push({
          candidateId: log.candidate._id,
          candidateName: log.candidate.name,
          candidateEmail: log.candidate.email,
          candidateDepartment: log.candidate.department || 'General',
          examId: log.exam._id,
          examTitle: log.exam.title,
          warningsCount: warnings.length,
          latestImagePath: latestImageLog ? latestImageLog.imagePath : null,
          lastActivityType: lastLog.type,
          lastActivityTime: lastLog.timestamp,
        });
      }
    }

    res.status(200).json({ success: true, count: liveSessions.length, sessions: liveSessions });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  logWarning,
  uploadFrame,
  getProctorLogs,
  getLiveProctorSessions,
};
