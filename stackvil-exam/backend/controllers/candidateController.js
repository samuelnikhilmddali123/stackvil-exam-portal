const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Result = require('../models/Result');
const User = require('../models/User');
const { sendEmail } = require('../config/mailer');

/**
 * @desc    Get exams assigned to the logged-in candidate
 * @route   GET /api/candidate/exams
 * @access  Private (Candidate)
 */
const getAssignedExams = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Find active exams where this candidate is assigned
    const exams = await Exam.find({
      assignedCandidates: userId,
      status: 'Active',
    }).select('-questions'); // Don't send questions yet

    // For each exam, check if candidate already has a result
    const results = await Result.find({ candidate: userId });
    const completedExamIds = results.map((r) => r.exam.toString());

    const formattedExams = exams.map((exam) => {
      const isCompleted = completedExamIds.includes(exam._id.toString());
      return {
        _id: exam._id,
        title: exam.title,
        description: exam.description,
        duration: exam.duration,
        startDate: exam.startDate,
        endDate: exam.endDate,
        isCompleted,
      };
    });

    res.status(200).json({ success: true, count: formattedExams.length, exams: formattedExams });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Start exam - retrieve questions WITH correct answers stripped
 * @route   GET /api/candidate/exams/:id/start
 * @access  Private (Candidate)
 */
const startExam = async (req, res, next) => {
  try {
    const examId = req.params.id;
    const userId = req.user.id;

    // Verify candidate is assigned to this exam
    const exam = await Exam.findById(examId).populate({
      path: 'questions',
      select: '-correctAnswer -codeTemplates.testCases', // Keep answers hidden!
    });

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (exam.status !== 'Active') {
      return res.status(400).json({ success: false, message: 'Exam is not currently active' });
    }

    const isAssigned = exam.assignedCandidates.some(
      (candId) => candId.toString() === userId.toString()
    );

    if (!isAssigned) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this exam' });
    }

    // Check if already submitted
    const existingResult = await Result.findOne({ candidate: userId, exam: examId });
    if (existingResult) {
      return res.status(400).json({ success: false, message: 'You have already submitted this exam' });
    }

    // Randomize questions if configured
    let loadedQuestions = [...exam.questions];
    if (exam.randomizeQuestions) {
      loadedQuestions.sort(() => Math.random() - 0.5);
    }

    // Shuffle options if configured
    if (exam.shuffleOptions) {
      loadedQuestions = loadedQuestions.map((q) => {
        if (q.options && q.options.length > 0 && q.type !== 'True/False') {
          const shuffledOpts = [...q.options].sort(() => Math.random() - 0.5);
          // Return new object with shuffled options
          const qObj = q.toObject();
          qObj.options = shuffledOpts;
          return qObj;
        }
        return q;
      });
    }

    res.status(200).json({
      success: true,
      exam: {
        _id: exam._id,
        title: exam.title,
        description: exam.description,
        duration: exam.duration,
        questions: loadedQuestions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit exam & evaluate score
 * @route   POST /api/candidate/exams/:id/submit
 * @access  Private (Candidate)
 */
const submitExam = async (req, res, next) => {
  try {
    const examId = req.params.id;
    const userId = req.user.id;
    const { responses, totalTimeTaken, warningsCount } = req.body;

    // Check if result already exists
    const existingResult = await Result.findOne({ candidate: userId, exam: examId });
    if (existingResult) {
      return res.status(400).json({ success: false, message: 'Exam already submitted' });
    }

    const exam = await Exam.findById(examId).populate('questions');
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    let totalMarks = 0;
    let scoreObtained = 0;
    const gradedResponses = [];

    // Loop through exam questions to grade them
    for (const question of exam.questions) {
      totalMarks += question.marks;
      
      const candidateResp = responses.find(
        (r) => r.questionId.toString() === question._id.toString()
      );
      
      const candidateAns = candidateResp ? candidateResp.answer : null;
      const timeSpentOnQ = candidateResp ? candidateResp.timeSpent : 0;

      let isCorrect = false;
      let marksObtained = 0;

      if (candidateAns !== undefined && candidateAns !== null && candidateAns !== '') {
        // Grade based on question type
        if (question.type === 'MCQ' || question.type === 'True/False') {
          isCorrect = String(candidateAns).trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase();
        } else if (question.type === 'Checkbox') {
          if (Array.isArray(candidateAns) && Array.isArray(question.correctAnswer)) {
            const sortedCandidate = [...candidateAns].map(String).sort();
            const sortedCorrect = [...question.correctAnswer].map(String).sort();
            isCorrect =
              sortedCandidate.length === sortedCorrect.length &&
              sortedCandidate.every((val, index) => val === sortedCorrect[index]);
          }
        } else if (question.type === 'Paragraph') {
          // Semi-matching or basic substring validation for simulation
          const normalizedCandidate = String(candidateAns).trim().toLowerCase();
          const normalizedCorrect = String(question.correctAnswer).trim().toLowerCase();
          isCorrect = normalizedCandidate.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedCandidate);
        } else if (question.type === 'Image') {
          isCorrect = String(candidateAns).trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase();
        } else if (question.type === 'Coding') {
          // Grader for JavaScript/NodeJS test cases. For other coding types, default match template
          const jsTemplate = question.codeTemplates.find(t => t.language === 'javascript' || t.language === 'nodejs');
          if (jsTemplate && jsTemplate.testCases && jsTemplate.testCases.length > 0) {
            try {
              let passed = true;
              let funcName = 'solution';
              const funcMatch = String(candidateAns).match(/function\s+(\w+)\s*\(/);
              if (funcMatch) {
                funcName = funcMatch[1];
              } else {
                const templateMatch = jsTemplate.template.match(/function\s+(\w+)\s*\(/);
                if (templateMatch) {
                  funcName = templateMatch[1];
                }
              }
              
              // Run test cases in a simple sandbox
              for (const testCase of jsTemplate.testCases) {
                // Construct standard dynamic JS function run
                const runnerCode = `
                  ${candidateAns}
                  return ${funcName}(${testCase.input});
                `;
                const runFunc = new Function(runnerCode);
                const result = runFunc();
                
                if (String(result).trim() !== String(testCase.output).trim()) {
                  passed = false;
                  break;
                }
              }
              isCorrect = passed;
            } catch (err) {
              isCorrect = false;
            }
          } else {
            // Non-JS coding questions: fallback code text check
            isCorrect = String(candidateAns).includes('return') || String(candidateAns).length > 20;
          }
        }

        if (isCorrect) {
          marksObtained = question.marks;
          scoreObtained += question.marks;
        }
      }

      gradedResponses.push({
        questionId: question._id,
        answer: candidateAns,
        isCorrect,
        marksObtained,
        timeSpent: timeSpentOnQ,
      });
    }

    const percentage = totalMarks > 0 ? (scoreObtained / totalMarks) * 100 : 0;
    const status = percentage >= exam.passingScore ? 'Pass' : 'Fail';

    // Create result record
    const result = await Result.create({
      candidate: userId,
      exam: examId,
      responses: gradedResponses,
      score: scoreObtained,
      percentage,
      status,
      totalTimeTaken,
      warningsCount: warningsCount || 0,
    });

    // Send Result confirmation email
    const user = await User.findById(userId);
    if (user) {
      const subject = `Exam Submission: ${exam.title}`;
      const text = `Hello ${user.name},\n\nYou have successfully completed the exam "${exam.title}".\nScore: ${scoreObtained}/${totalMarks} (${percentage.toFixed(1)}%)\nStatus: ${status}\n\nThank you for participating!`;
      const html = `
        <h3>Stackvil Examination Submission</h3>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>You have submitted the exam: <strong>${exam.title}</strong></p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px;">
          <p><strong>Total Marks Available:</strong> ${totalMarks}</p>
          <p><strong>Your Score:</strong> ${scoreObtained}</p>
          <p><strong>Percentage Score:</strong> ${percentage.toFixed(1)}%</p>
          <p><strong>Passing Score Target:</strong> ${exam.passingScore}%</p>
          <p><strong>Result Status:</strong> <span style="color: ${status === 'Pass' ? '#10b981' : '#ef4444'}; font-weight: bold;">${status.toUpperCase()}</span></p>
        </div>
      `;
      await sendEmail({ to: user.email, subject, text, html });
    }

    res.status(201).json({
      success: true,
      message: 'Exam submitted and graded successfully',
      result: {
        id: result._id,
        score: result.score,
        percentage: result.percentage,
        status: result.status,
        warningsCount: result.warningsCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Retrieve results history for candidate
 * @route   GET /api/candidate/results
 * @access  Private (Candidate)
 */
const getCandidateResults = async (req, res, next) => {
  try {
    const results = await Result.find({ candidate: req.user.id })
      .populate('exam', 'title duration passingScore')
      .populate('candidate', 'name email department')
      .sort({ submittedAt: -1 });

    res.status(200).json({ success: true, results });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Run candidate coding question template code against test cases
 * @route   POST /api/candidate/exams/:id/run-code
 * @access  Private (Candidate)
 */
const runCodingTest = async (req, res, next) => {
  try {
    const { questionId, code, language } = req.body;

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    if (question.type !== 'Coding') {
      return res.status(400).json({ success: false, message: 'Not a coding question' });
    }

    const jsTemplate = question.codeTemplates.find(
      t => t.language === 'javascript' || t.language === 'nodejs'
    );

    if (!jsTemplate) {
      return res.status(400).json({ success: false, message: 'Coding execution not supported for this language' });
    }

    const results = [];
    let allPassed = true;

    // Detect function name
    let funcName = 'solution';
    const funcMatch = String(code).match(/function\s+(\w+)\s*\(/);
    if (funcMatch) {
      funcName = funcMatch[1];
    } else {
      const templateMatch = jsTemplate.template.match(/function\s+(\w+)\s*\(/);
      if (templateMatch) {
        funcName = templateMatch[1];
      }
    }

    for (let i = 0; i < jsTemplate.testCases.length; i++) {
      const testCase = jsTemplate.testCases[i];
      let outputVal = null;
      let passed = false;
      let errorMsg = null;

      try {
        const runnerCode = `
          ${code}
          return ${funcName}(${testCase.input});
        `;
        const runFunc = new Function(runnerCode);
        outputVal = runFunc();
        passed = String(outputVal).trim() === String(testCase.output).trim();
      } catch (err) {
        passed = false;
        errorMsg = err.message;
      }

      if (!passed) allPassed = false;

      results.push({
        testCaseIndex: i + 1,
        input: testCase.input,
        expectedOutput: testCase.output,
        actualOutput: outputVal !== null ? String(outputVal) : '',
        passed,
        error: errorMsg
      });
    }

    res.status(200).json({
      success: true,
      allPassed,
      results
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAssignedExams,
  startExam,
  submitExam,
  getCandidateResults,
  runCodingTest,
};
