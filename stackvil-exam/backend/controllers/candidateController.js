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

    // Find exams where this candidate is assigned or general active exams
    let exams = await Exam.find({
      $or: [
        { assignedCandidates: userId },
        { assignedCandidates: { $size: 0 } },
        { assignedCandidates: { $exists: false } }
      ]
    }).select('-questions');

    // Include active exams or exams directly assigned to candidate
    exams = exams.filter(e => e.status === 'Active' || e.assignedCandidates?.some(c => c.toString() === userId.toString()));

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

    const isAssigned = exam.assignedCandidates.length === 0 || exam.assignedCandidates.some(
      (candId) => candId.toString() === userId.toString()
    );

    if (!isAssigned) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this exam' });
    }

    if (exam.status !== 'Active') {
      exam.status = 'Active';
      await exam.save();
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

// Helper to grade a candidate response
const gradeCandidateResponse = (question, candidateAns) => {
  let isCorrect = false;
  let marksObtained = 0;

  if (candidateAns !== undefined && candidateAns !== null && candidateAns !== '') {
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
      const normalizedCandidate = String(candidateAns).trim().toLowerCase();
      const normalizedCorrect = String(question.correctAnswer).trim().toLowerCase();
      isCorrect = normalizedCandidate.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedCandidate);
    } else if (question.type === 'Image') {
      isCorrect = String(candidateAns).trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase();
    } else if (question.type === 'Coding') {
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
          for (const testCase of jsTemplate.testCases) {
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
        isCorrect = String(candidateAns).includes('return') || String(candidateAns).length > 20;
      }
    }

    if (isCorrect) {
      marksObtained = question.marks;
    }
  }

  return { isCorrect, marksObtained };
};

// Helper to split exam questions
const splitExamQuestions = (questions) => {
  const aptitudeQ = questions.filter(q => q.category === 'Aptitude');
  const technicalOrOtherQ = questions.filter(q => q.category !== 'Aptitude');

  if (aptitudeQ.length > 0 && technicalOrOtherQ.length > 0) {
    return {
      round1: aptitudeQ,
      round2: technicalOrOtherQ
    };
  }

  if (questions.length === 60) {
    return {
      round1: questions.slice(0, 30),
      round2: questions.slice(30, 60)
    };
  }

  const mid = Math.ceil(questions.length / 2);
  return {
    round1: questions.slice(0, mid),
    round2: questions.slice(mid)
  };
};

/**
 * @desc    Get Round 1 Details & Questions
 * @route   GET /api/candidate/exams/:id/round/1
 * @access  Private (Candidate)
 */
const getRound1 = async (req, res, next) => {
  try {
    const examId = req.params.id;
    const userId = req.user.id;

    const exam = await Exam.findById(examId).populate({
      path: 'questions',
      select: '-correctAnswer -codeTemplates.testCases',
    });

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (exam.status !== 'Active') {
      return res.status(400).json({ success: false, message: 'Exam is not currently active' });
    }

    // Verify assigned
    const isAssigned = !exam.assignedCandidates || exam.assignedCandidates.length === 0 || exam.assignedCandidates.some(c => c.toString() === userId.toString());
    if (!isAssigned) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this exam' });
    }

    // Check if Round 1 is already completed
    const existingResult = await Result.findOne({ candidate: userId, exam: examId });
    if (existingResult && existingResult.round1 && existingResult.round1.completed) {
      return res.status(400).json({ success: false, message: 'You have already completed Round 1' });
    }

    const { round1 } = splitExamQuestions(exam.questions);

    res.status(200).json({
      success: true,
      examTitle: exam.title,
      roundName: 'Aptitude Assessment',
      duration: 30, // 30 Minutes
      questions: round1
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit and Grade Round 1
 * @route   POST /api/candidate/exams/:id/round/1/submit
 * @access  Private (Candidate)
 */
const submitRound1 = async (req, res, next) => {
  try {
    const examId = req.params.id;
    const userId = req.user.id;
    const { responses, totalTimeTaken, warningsCount } = req.body;

    const exam = await Exam.findById(examId).populate('questions');
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // Check if result already exists and round 1 completed
    let result = await Result.findOne({ candidate: userId, exam: examId });
    if (result && result.round1 && result.round1.completed) {
      return res.status(400).json({ success: false, message: 'Round 1 already submitted' });
    }

    const { round1 } = splitExamQuestions(exam.questions);
    let round1TotalMarks = 0;
    let round1Score = 0;
    const gradedResponses = [];

    for (const question of round1) {
      round1TotalMarks += question.marks;
      const candidateResp = responses.find(r => r.questionId.toString() === question._id.toString());
      const candidateAns = candidateResp ? candidateResp.answer : null;
      const timeSpentOnQ = candidateResp ? candidateResp.timeSpent : 0;

      const { isCorrect, marksObtained } = gradeCandidateResponse(question, candidateAns);
      if (isCorrect) {
        round1Score += question.marks;
      }

      gradedResponses.push({
        questionId: question._id,
        answer: candidateAns,
        isCorrect,
        marksObtained,
        timeSpent: timeSpentOnQ,
      });
    }

    const round1Percentage = round1TotalMarks > 0 ? (round1Score / round1TotalMarks) * 100 : 0;
    const round1Status = round1Percentage >= exam.passingScore ? 'Pass' : 'Fail';

    if (!result) {
      result = new Result({
        candidate: userId,
        exam: examId,
      });
    }

    result.round1 = {
      responses: gradedResponses,
      score: round1Score,
      percentage: round1Percentage,
      status: round1Status,
      completed: true,
      completedTime: new Date(),
      totalTimeTaken: totalTimeTaken || 0,
    };
    result.warningsCount = Math.max(result.warningsCount || 0, warningsCount || 0);

    await result.save();

    res.status(200).json({
      success: true,
      message: 'Round 1 submitted and graded successfully',
      result: result.round1
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Round 2 Details & Questions (Technical Assessment)
 * @route   GET /api/candidate/exams/:id/round/2
 * @access  Private (Candidate)
 */
const getRound2 = async (req, res, next) => {
  try {
    const examId = req.params.id;
    const userId = req.user.id;

    // Verify Round 1 completed
    const result = await Result.findOne({ candidate: userId, exam: examId });
    if (!result || !result.round1 || !result.round1.completed) {
      return res.status(403).json({ success: false, message: 'Candidate must NEVER access Round 2 until Round 1 has been successfully submitted.' });
    }

    if (result.round2 && result.round2.completed) {
      return res.status(400).json({ success: false, message: 'You have already completed Round 2' });
    }

    const exam = await Exam.findById(examId).populate({
      path: 'questions',
      select: '-correctAnswer -codeTemplates.testCases',
    });

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const { round2 } = splitExamQuestions(exam.questions);

    res.status(200).json({
      success: true,
      examTitle: exam.title,
      roundName: 'Technical Assessment',
      duration: 45, // 45 Minutes
      questions: round2
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit, Grade Round 2 and Calculate Overall Result
 * @route   POST /api/candidate/exams/:id/round/2/submit
 * @access  Private (Candidate)
 */
const submitRound2 = async (req, res, next) => {
  try {
    const examId = req.params.id;
    const userId = req.user.id;
    const { responses, totalTimeTaken, warningsCount } = req.body;

    const result = await Result.findOne({ candidate: userId, exam: examId });
    if (!result || !result.round1 || !result.round1.completed) {
      return res.status(403).json({ success: false, message: 'Round 1 must be completed first.' });
    }

    if (result.round2 && result.round2.completed) {
      return res.status(400).json({ success: false, message: 'Round 2 already submitted' });
    }

    const exam = await Exam.findById(examId).populate('questions');
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const { round2 } = splitExamQuestions(exam.questions);
    let round2TotalMarks = 0;
    let round2Score = 0;
    const gradedResponses = [];

    for (const question of round2) {
      round2TotalMarks += question.marks;
      const candidateResp = responses.find(r => r.questionId.toString() === question._id.toString());
      const candidateAns = candidateResp ? candidateResp.answer : null;
      const timeSpentOnQ = candidateResp ? candidateResp.timeSpent : 0;

      const { isCorrect, marksObtained } = gradeCandidateResponse(question, candidateAns);
      if (isCorrect) {
        round2Score += question.marks;
      }

      gradedResponses.push({
        questionId: question._id,
        answer: candidateAns,
        isCorrect,
        marksObtained,
        timeSpent: timeSpentOnQ,
      });
    }

    const round2Percentage = round2TotalMarks > 0 ? (round2Score / round2TotalMarks) * 100 : 0;
    const round2Status = round2Percentage >= exam.passingScore ? 'Pass' : 'Fail';

    result.round2 = {
      responses: gradedResponses,
      score: round2Score,
      percentage: round2Percentage,
      status: round2Status,
      completed: true,
      completedTime: new Date(),
      totalTimeTaken: totalTimeTaken || 0,
    };
    result.warningsCount = Math.max(result.warningsCount || 0, warningsCount || 0);

    // Calculate Overall stats
    result.responses = [...result.round1.responses, ...result.round2.responses];
    result.score = result.round1.score + result.round2.score;
    result.totalTimeTaken = result.round1.totalTimeTaken + result.round2.totalTimeTaken;

    let examTotalMarks = 0;
    exam.questions.forEach(q => {
      examTotalMarks += q.marks;
    });

    result.percentage = examTotalMarks > 0 ? (result.score / examTotalMarks) * 100 : 0;
    result.status = result.percentage >= exam.passingScore ? 'Pass' : 'Fail';
    result.submittedAt = new Date();

    await result.save();

    // Send final Result confirmation email
    const user = await User.findById(userId);
    if (user) {
      const subject = `Final Assessment Results: ${exam.title}`;
      const text = `Hello ${user.name},\n\nYou have successfully completed all rounds of "${exam.title}".\n\nOverall Score: ${result.score}/${examTotalMarks} (${result.percentage.toFixed(1)}%)\nRound 1 Score: ${result.round1.score}\nRound 2 Score: ${result.round2.score}\nResult: ${result.status}\n\nThank you!`;
      const html = `
        <h3>Stackvil Examination Submission</h3>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>You have submitted all rounds of: <strong>${exam.title}</strong></p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px;">
          <p><strong>Overall Score:</strong> ${result.score} / ${examTotalMarks} (${result.percentage.toFixed(1)}%)</p>
          <p><strong>Round 1 Score (Aptitude):</strong> ${result.round1.score} Marks</p>
          <p><strong>Round 2 Score (Technical):</strong> ${result.round2.score} Marks</p>
          <p><strong>Result Status:</strong> <span style="color: ${result.status === 'Pass' ? '#10b981' : '#ef4444'}; font-weight: bold;">${result.status.toUpperCase()}</span></p>
        </div>
      `;
      await sendEmail({ to: user.email, subject, text, html });
    }

    res.status(200).json({
      success: true,
      message: 'Round 2 submitted and final results calculated',
      result: {
        id: result._id,
        score: result.score,
        percentage: result.percentage,
        status: result.status,
        round1: result.round1,
        round2: result.round2
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Candidate Final Graded Result
 * @route   GET /api/candidate/exams/:id/final-result
 * @access  Private (Candidate)
 */
const getFinalResult = async (req, res, next) => {
  try {
    const examId = req.params.id;
    const userId = req.user.id;

    const result = await Result.findOne({ candidate: userId, exam: examId })
      .populate('candidate', 'name email department')
      .populate({
        path: 'exam',
        populate: { path: 'questions' }
      });

    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }

    res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Round 3 Workspace (Coding Assessment)
 * @route   GET /api/candidate/exams/:id/round/3
 * @access  Private (Candidate)
 */
const getRound3 = async (req, res, next) => {
  try {
    const examId = req.params.id;
    const userId = req.user.id;

    let result = await Result.findOne({ candidate: userId, exam: examId });
    if (!result) {
      result = await Result.create({
        candidate: userId,
        exam: examId,
        responses: [],
        score: 0,
        percentage: 0,
        status: 'Pending',
        round1: { completed: true },
        round2: { completed: true }
      });
    }

    if (result.round3 && result.round3.completed) {
      return res.status(400).json({ success: false, message: 'You have already completed Round 3.' });
    }

    // Default project workspace files
    const defaultFiles = {
      'frontend/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Employee Management System</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>Employee Directory</h1>
            <p>Verify backend functionality by adding, editing, and deleting records.</p>
        </header>
        
        <div class="grid">
            <!-- Form -->
            <section class="card">
                <h2>Manage Employee</h2>
                <form id="employeeForm">
                    <input type="hidden" id="employeeId">
                    <div class="form-group">
                        <label for="name">Full Name</label>
                        <input type="text" id="name" required placeholder="e.g. Samuel Nikhil">
                    </div>
                    <div class="form-group">
                        <label for="email">Email Address</label>
                        <input type="email" id="email" required placeholder="e.g. samuel@example.com">
                    </div>
                    <div class="form-group">
                        <label for="department">Department</label>
                        <select id="department" required>
                            <option value="">Select Department</option>
                            <option value="Engineering">Engineering</option>
                            <option value="Marketing">Marketing</option>
                            <option value="HR">HR</option>
                            <option value="Finance">Finance</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="salary">Monthly Salary ($)</label>
                        <input type="number" id="salary" required placeholder="e.g. 5000">
                    </div>
                    <div class="actions">
                        <button type="submit" class="btn primary">Save Employee</button>
                        <button type="button" id="cancelBtn" class="btn secondary">Cancel</button>
                    </div>
                </form>
            </section>

            <!-- Table -->
            <section class="card">
                <h2>Active Staff</h2>
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Department</th>
                                <th>Salary</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="employeeTableBody">
                            <tr>
                                <td colspan="5" class="empty-state">No employee records found. Connect your backend APIs to load data.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>`,
      'frontend/style.css': `:root {
    --bg-color: #0f172a;
    --card-bg: #1e293b;
    --border-color: #334155;
    --text-color: #f8fafc;
    --text-muted: #94a3b8;
    --brand-color: #3b82f6;
    --brand-hover: #2563eb;
    --success-color: #10b981;
    --danger-color: #ef4444;
}
body {
    background: var(--bg-color);
    color: var(--text-color);
    font-family: system-ui, -apple-system, sans-serif;
    margin: 0;
    padding: 20px;
}
.container {
    max-width: 1200px;
    margin: 0 auto;
}
header {
    margin-bottom: 30px;
}
h1 { margin: 0 0 10px 0; font-size: 2.25rem; font-weight: 800; }
p { margin: 0; color: var(--text-muted); }
.grid {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 30px;
}
.card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
h2 { margin: 0 0 20px 0; font-size: 1.25rem; font-weight: 700; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; }
.form-group {
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}
label { font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
input, select {
    background: #0f172a;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 10px 14px;
    color: white;
    outline: none;
    font-size: 0.9rem;
}
input:focus, select:focus {
    border-color: var(--brand-color);
}
.actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
}
.btn {
    padding: 10px 18px;
    border-radius: 8px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    font-size: 0.85rem;
}
.btn.primary { background: var(--brand-color); color: white; }
.btn.primary:hover { background: var(--brand-hover); }
.btn.secondary { background: #334155; color: var(--text-color); }
.btn.secondary:hover { background: #475569; }
.btn.danger { background: var(--danger-color); color: white; }
.btn.edit { background: var(--success-color); color: white; }

table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
}
th, td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
    text-align: left;
}
th { color: var(--text-muted); font-weight: 600; }
.empty-state {
    text-align: center;
    color: var(--text-muted);
    padding: 40px 0;
}`,
      'frontend/script.js': `// REST API URL Endpoint configuration
const API_BASE = '/api/employees';

// State
let employees = [];

// DOM Elements
const form = document.getElementById('employeeForm');
const tableBody = document.getElementById('employeeTableBody');
const employeeIdInput = document.getElementById('employeeId');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const deptInput = document.getElementById('department');
const salaryInput = document.getElementById('salary');
const cancelBtn = document.getElementById('cancelBtn');

// Load employees list on initialization
document.addEventListener('DOMContentLoaded', () => {
    fetchEmployees();
});

// Fetch employees from database
async function fetchEmployees() {
    try {
        const res = await fetch(API_BASE);
        const data = await res.json();
        if (data.success) {
            employees = data.data || [];
            renderTable();
        }
    } catch (err) {
        console.error('API Error: Failed to fetch employees list.', err);
    }
}

// Render employee rows
function renderTable() {
    if (employees.length === 0) {
        tableBody.innerHTML = \`<tr><td colspan="5" class="empty-state">No employee records found. Connect your backend APIs to load data.</td></tr>\`;
        return;
    }
    tableBody.innerHTML = employees.map(emp => \`
        <tr>
            <td>\${emp.name}</td>
            <td>\${emp.email}</td>
            <td>\${emp.department}</td>
            <td>\$\${emp.salary}</td>
            <td>
                <button onclick="editEmployee('\${emp.id || emp._id}')" class="btn edit">Edit</button>
                <button onclick="deleteEmployee('\${emp.id || emp._id}')" class="btn danger">Delete</button>
            </td>
        </tr>
    \`).join('');
}

// Save or Update Employee record
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const payload = {
        name: nameInput.value,
        email: emailInput.value,
        department: deptInput.value,
        salary: Number(salaryInput.value)
    };

    const empId = employeeIdInput.value;

    try {
        let res;
        if (empId) {
            // Update existing employee
            res = await fetch(\`\${API_BASE}/\${empId}\`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            // Create new employee record
            res = await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        const data = await res.json();
        if (data.success) {
            resetForm();
            fetchEmployees();
        }
    } catch (err) {
        console.error('API Error: Failed to save employee record.', err);
    }
});

// Edit employee event
function editEmployee(id) {
    const emp = employees.find(e => (e.id || e._id) === id);
    if (!emp) return;
    employeeIdInput.value = id;
    nameInput.value = emp.name;
    emailInput.value = emp.email;
    deptInput.value = emp.department;
    salaryInput.value = emp.salary;
}

// Delete employee event
async function deleteEmployee(id) {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    try {
        const res = await fetch(\`\${API_BASE}/\${id}\`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
            fetchEmployees();
        }
    } catch (err) {
        console.error('API Error: Failed to delete employee record.', err);
    }
}

function resetForm() {
    form.reset();
    employeeIdInput.value = '';
}

cancelBtn.addEventListener('click', resetForm);`,
      'backend/server.js': `const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('./routes');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Mount API router
app.use('/api', routes);

app.listen(PORT, () => {
    console.log(\`Server listening on port \${PORT}\`);
});`,
      'backend/package.json': `{
  "name": "backend-developer-assessment",
  "version": "1.0.0",
  "description": "Backend SQL Node.js assessment",
  "main": "server.js",
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "mysql2": "^3.9.7"
  }
}`,
      'backend/.env': `PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=secret
DB_NAME=company_db`,
      'backend/db.js': `const mysql = require('mysql2');

// TODO: Create a MySQL Connection Pool using configuration variables
// Return the pool to be consumed in controller.js
const pool = null;

module.exports = pool;`,
      'backend/routes.js': `const express = require('express');
const controller = require('./controller');
const router = express.Router();

// TODO: Map REST endpoints to controller methods
// GET /employees
// POST /employees
// PUT /employees/:id
// DELETE /employees/:id

module.exports = router;`,
      'backend/controller.js': `const pool = require('./db');

// TODO: Implement GET /employees controller logic
const getEmployees = async (req, res) => {
    // Execute SQL select query
};

// TODO: Implement POST /employees controller logic
const createEmployee = async (req, res) => {
    // Parse payload and execute SQL insert query
};

// TODO: Implement PUT /employees/:id controller logic
const updateEmployee = async (req, res) => {
    // Parse payload and execute SQL update query
};

// TODO: Implement DELETE /employees/:id controller logic
const deleteEmployee = async (req, res) => {
    // Execute SQL delete query
};

module.exports = {
    getEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee
};`,
      'backend/model.js': `// Define Employee Schema / Data model helper mapping if required`,
      'backend/schema.sql': `-- TODO: Write SQL DDL schema script to initialize employee tables
-- Include table layout: id, name, email, department, salary, created_at`
    };

    // Fetch exam to check for custom coding project files
    const exam = await Exam.findById(examId);
    let initialProjectFiles = defaultFiles;

    if (exam && exam.codingProject && exam.codingProject.hasProject && exam.codingProject.files) {
      const examFiles = exam.codingProject.files instanceof Map
        ? Object.fromEntries(exam.codingProject.files)
        : exam.codingProject.files;
      if (Object.keys(examFiles).length > 0) {
        initialProjectFiles = examFiles;
      }
    }

    // If workspace is not initialized, set initial project files
    const hasFiles = result.round3 && result.round3.files && (
      result.round3.files instanceof Map 
        ? result.round3.files.size > 0 
        : Object.keys(result.round3.files || {}).length > 0
    );

    if (!hasFiles) {
      result.round3 = {
        files: initialProjectFiles,
        completed: false,
        completedTime: null,
        score: 0,
        percentage: 0,
        status: 'Pending',
        totalTimeTaken: 0
      };
      await result.save();
    }

    res.status(200).json({
      success: true,
      examTitle: (result.exam && result.exam.title) || (exam && exam.title) || 'Coding Assessment',
      roundName: 'Coding Assessment',
      duration: 60, // 60 Minutes
      files: result.round3.files
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Save Round 3 Workspace edits (autosave)
 * @route   POST /api/candidate/exams/:id/round/3/save
 * @access  Private (Candidate)
 */
const saveRound3Edits = async (req, res, next) => {
  try {
    const examId = req.params.id;
    const userId = req.user.id;
    const { files, totalTimeTaken } = req.body;

    const result = await Result.findOne({ candidate: userId, exam: examId });
    if (!result || !result.round2 || !result.round2.completed) {
      return res.status(403).json({ success: false, message: 'You must complete Round 2 first.' });
    }

    if (result.round3 && result.round3.completed) {
      return res.status(400).json({ success: false, message: 'Round 3 already submitted.' });
    }

    if (files) {
      result.round3.files = files;
    }
    if (totalTimeTaken) {
      result.round3.totalTimeTaken = totalTimeTaken;
    }

    await result.save();

    res.status(200).json({
      success: true,
      message: 'Workspace saved successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit and Grade Round 3
 * @route   POST /api/candidate/exams/:id/round/3/submit
 * @access  Private (Candidate)
 */
const submitRound3 = async (req, res, next) => {
  try {
    const examId = req.params.id;
    const userId = req.user.id;
    const { files, totalTimeTaken, warningsCount } = req.body;

    const result = await Result.findOne({ candidate: userId, exam: examId });
    if (!result || !result.round2 || !result.round2.completed) {
      return res.status(403).json({ success: false, message: 'Round 2 must be completed first.' });
    }

    if (result.round3 && result.round3.completed) {
      return res.status(400).json({ success: false, message: 'Round 3 already submitted.' });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const activeFiles = files || result.round3.files || {};

    // Automated grading logic out of 100 marks
    let score = 0;
    const details = {};

    // 1. SQL check (25 marks)
    const sqlCode = activeFiles['backend/schema.sql'] || '';
    const hasSqlTable = sqlCode.toLowerCase().includes('create table') && sqlCode.toLowerCase().includes('employees');
    const hasSqlFields = sqlCode.toLowerCase().includes('id') && sqlCode.toLowerCase().includes('name') && sqlCode.toLowerCase().includes('email');
    if (hasSqlTable && hasSqlFields) {
      score += 25;
      details.sql = 25;
    } else if (hasSqlTable) {
      score += 15;
      details.sql = 15;
    } else {
      details.sql = 0;
    }

    // 2. Database Connection Pool check (25 marks)
    const dbCode = activeFiles['backend/db.js'] || '';
    const hasCreatePool = dbCode.includes('createPool') || dbCode.includes('createConnection');
    const exportsPool = dbCode.includes('module.exports = pool') || dbCode.includes('module.exports =') ;
    if (hasCreatePool && exportsPool) {
      score += 25;
      details.db = 25;
    } else if (hasCreatePool || exportsPool) {
      score += 10;
      details.db = 10;
    } else {
      details.db = 0;
    }

    // 3. Controller endpoints check (25 marks)
    const ctrlCode = activeFiles['backend/controller.js'] || '';
    const hasGet = ctrlCode.toLowerCase().includes('getemployees') || ctrlCode.toLowerCase().includes('select');
    const hasInsert = ctrlCode.toLowerCase().includes('createemployee') || ctrlCode.toLowerCase().includes('insert');
    const hasUpdate = ctrlCode.toLowerCase().includes('updateemployee') || ctrlCode.toLowerCase().includes('update');
    const hasDelete = ctrlCode.toLowerCase().includes('deleteemployee') || ctrlCode.toLowerCase().includes('delete');
    
    let ctrlScore = 0;
    if (hasGet) ctrlScore += 7;
    if (hasInsert) ctrlScore += 6;
    if (hasUpdate) ctrlScore += 6;
    if (hasDelete) ctrlScore += 6;
    score += ctrlScore;
    details.controller = ctrlScore;

    // 4. API Integration check (25 marks)
    const scriptCode = activeFiles['frontend/script.js'] || '';
    const hasFetch = scriptCode.includes('fetch(') || scriptCode.includes('fetchEmployees');
    const hasRender = scriptCode.includes('renderTable') || scriptCode.includes('innerHTML');
    if (hasFetch && hasRender) {
      score += 25;
      details.integration = 25;
    } else if (hasFetch || hasRender) {
      score += 12;
      details.integration = 12;
    } else {
      details.integration = 0;
    }

    result.round3 = {
      files: activeFiles,
      score,
      percentage: score,
      status: score >= exam.passingScore ? 'Pass' : 'Fail',
      completed: true,
      completedTime: new Date(),
      totalTimeTaken: totalTimeTaken || 0,
    };
    result.warningsCount = Math.max(result.warningsCount || 0, warningsCount || 0);

    // Update overall aggregate score
    result.score = result.round1.score + result.round2.score + result.round3.score;
    result.totalTimeTaken = result.round1.totalTimeTaken + result.round2.totalTimeTaken + result.round3.totalTimeTaken;

    let examTotalMarks = 0;
    exam.questions.forEach(q => {
      examTotalMarks += q.marks;
    });
    examTotalMarks += 100; // Add round 3 marks

    result.percentage = examTotalMarks > 0 ? (result.score / examTotalMarks) * 100 : 0;
    result.status = result.percentage >= exam.passingScore ? 'Pass' : 'Fail';
    result.submittedAt = new Date();

    await result.save();

    // Send final Result confirmation email
    const user = await User.findById(userId);
    if (user) {
      const subject = `Final Assessment Results: ${exam.title}`;
      const text = `Hello ${user.name},\n\nYou have successfully completed all rounds of "${exam.title}".\n\nOverall Score: ${result.score}/${examTotalMarks} (${result.percentage.toFixed(1)}%)\nRound 1 Score: ${result.round1.score}\nRound 2 Score: ${result.round2.score}\nRound 3 Score: ${result.round3.score}\nResult: ${result.status}\n\nThank you!`;
      const html = `
        <h3>Stackvil Examination Submission</h3>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>You have submitted all rounds of: <strong>${exam.title}</strong></p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px;">
          <p><strong>Overall Score:</strong> ${result.score} / ${examTotalMarks} (${result.percentage.toFixed(1)}%)</p>
          <p><strong>Round 1 Score (Aptitude):</strong> ${result.round1.score} Marks</p>
          <p><strong>Round 2 Score (Technical):</strong> ${result.round2.score} Marks</p>
          <p><strong>Round 3 Score (Coding Workspace):</strong> ${result.round3.score} Marks</p>
          <p><strong>Result Status:</strong> <span style="color: ${result.status === 'Pass' ? '#10b981' : '#ef4444'}; font-weight: bold;">${result.status.toUpperCase()}</span></p>
        </div>
      `;
      await sendEmail({ to: user.email, subject, text, html });
    }

    res.status(200).json({
      success: true,
      message: 'Round 3 submitted and final results calculated',
      result: {
        id: result._id,
        score: result.score,
        percentage: result.percentage,
        status: result.status,
        round1: result.round1,
        round2: result.round2,
        round3: result.round3
      }
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
  getRound1,
  submitRound1,
  getRound2,
  submitRound2,
  getRound3,
  saveRound3Edits,
  submitRound3,
  getFinalResult,
};
