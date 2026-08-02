const Result = require('../models/Result');
const Exam = require('../models/Exam');
const User = require('../models/User');
const ProctorLog = require('../models/ProctorLog');
const { generateResultPDF } = require('../utils/pdfGenerator');
const { jsonToExcel } = require('../utils/excelParser');

/**
 * @desc    Get detailed exam report
 * @route   GET /api/reports/exams/:examId
 * @access  Private (Admin/Superadmin)
 */
const getExamReport = async (req, res, next) => {
  try {
    const examId = req.params.examId;

    const exam = await Exam.findById(examId).populate('questions', 'text type marks');
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const results = await Result.find({ exam: examId })
      .populate('candidate', 'name email department status')
      .sort({ score: -1 });

    // Calculate aggregated metrics
    let totalScoreSum = 0;
    let totalPercentageSum = 0;
    let passCount = 0;
    let totalTimeSum = 0;

    let totalCorrect = 0;
    let totalWrong = 0;
    let totalSkipped = 0;

    results.forEach((r) => {
      totalScoreSum += r.score;
      totalPercentageSum += r.percentage;
      totalTimeSum += r.totalTimeTaken;
      if (r.status === 'Pass') passCount++;

      r.responses.forEach((resp) => {
        if (resp.isCorrect) {
          totalCorrect++;
        } else if (resp.answer === undefined || resp.answer === null || resp.answer === '') {
          totalSkipped++;
        } else {
          totalWrong++;
        }
      });
    });

    const count = results.length;
    const averageScore = count > 0 ? totalScoreSum / count : 0;
    const averagePercentage = count > 0 ? totalPercentageSum / count : 0;
    const averageTime = count > 0 ? totalTimeSum / count : 0;
    const passPercentage = count > 0 ? (passCount / count) * 100 : 0;

    res.status(200).json({
      success: true,
      exam: {
        title: exam.title,
        questionsCount: exam.questions.length,
        duration: exam.duration,
      },
      stats: {
        totalSubmissions: count,
        averageScore: averageScore.toFixed(1),
        averagePercentage: averagePercentage.toFixed(1),
        passPercentage: passPercentage.toFixed(1),
        averageTimeTaken: Math.round(averageTime),
        correctCount: totalCorrect,
        wrongCount: totalWrong,
        skippedCount: totalSkipped,
      },
      results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get candidate single result details and logs
 * @route   GET /api/reports/candidate/:candidateId/exam/:examId
 * @access  Private (Admin/Superadmin/Candidate)
 */
const getCandidateReport = async (req, res, next) => {
  try {
    const { candidateId, examId } = req.params;

    const result = await Result.findOne({ candidate: candidateId, exam: examId })
      .populate('candidate', 'name email department')
      .populate('exam', 'title duration passingScore questions');

    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found for this candidate exam session' });
    }

    const proctorLog = await ProctorLog.findOne({ candidate: candidateId, exam: examId });

    res.status(200).json({
      success: true,
      result,
      proctorLog: proctorLog || { logs: [] },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get department-wise average exam scores
 * @route   GET /api/reports/departments
 * @access  Private (Admin/Superadmin)
 */
const getDepartmentReport = async (req, res, next) => {
  try {
    const results = await Result.find().populate('candidate', 'department');
    
    const departmentStats = {};

    results.forEach((r) => {
      if (!r.candidate) return;
      const dept = r.candidate.department || 'General';

      if (!departmentStats[dept]) {
        departmentStats[dept] = {
          department: dept,
          candidatesCount: 0,
          totalScore: 0,
          totalPercentage: 0,
          passCount: 0,
        };
      }

      departmentStats[dept].candidatesCount++;
      departmentStats[dept].totalScore += r.score;
      departmentStats[dept].totalPercentage += r.percentage;
      if (r.status === 'Pass') {
        departmentStats[dept].passCount++;
      }
    });

    const report = Object.values(departmentStats).map((dept) => ({
      department: dept.department,
      candidatesCount: dept.candidatesCount,
      averagePercentage: parseFloat((dept.totalPercentage / dept.candidatesCount).toFixed(1)),
      passRate: parseFloat(((dept.passCount / dept.candidatesCount) * 100).toFixed(1)),
    }));

    res.status(200).json({ success: true, report });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export exam results to Excel
 * @route   GET /api/reports/exams/:examId/export-excel
 * @access  Private (Admin/Superadmin)
 */
const exportExamExcel = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const results = await Result.find({ exam: examId }).populate('candidate', 'name email department');

    const data = results.map((r, index) => ({
      Rank: index + 1,
      'Candidate Name': r.candidate ? r.candidate.name : 'Unknown Candidate',
      'Candidate Email': r.candidate ? r.candidate.email : 'N/A',
      Department: r.candidate ? r.candidate.department : 'General',
      'Score Obtained': r.score,
      Percentage: `${r.percentage.toFixed(1)}%`,
      Status: r.status,
      'Warnings count': r.warningsCount,
      'Time Taken (s)': r.totalTimeTaken,
      'Completion Date': new Date(r.submittedAt).toLocaleDateString(),
    }));

    const buffer = jsonToExcel(data, 'Exam Results');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Exam-${exam.title.replace(/\s+/g, '_')}-Results.xlsx`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download result PDF
 * @route   GET /api/reports/results/:resultId/download-pdf
 * @access  Private (Admin/Superadmin/Candidate)
 */
const downloadResultPDF = async (req, res, next) => {
  try {
    const result = await Result.findById(req.params.resultId)
      .populate('candidate', 'name email department')
      .populate('exam', 'title duration passingScore');

    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }

    generateResultPDF(result, res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExamReport,
  getCandidateReport,
  getDepartmentReport,
  exportExamExcel,
  downloadResultPDF,
};
