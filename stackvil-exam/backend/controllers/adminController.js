const User = require('../models/User');
const Exam = require('../models/Exam');
const Result = require('../models/Result');
const Setting = require('../models/Setting');
const Question = require('../models/Question');
const { excelToJson, jsonToExcel } = require('../utils/excelParser');
const { sendEmail } = require('../config/mailer');
const fs = require('fs');
const pdfParse = require('pdf-parse');

/**
 * @desc    Get dashboard metrics & statistics
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin/Superadmin)
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const totalCandidates = await User.countDocuments({ role: 'candidate' });

    // Today's exams
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    
    const todaysExams = await Exam.countDocuments({
      startDate: { $gte: startOfToday, $lte: endOfToday },
    });

    const completedExamsCount = await Result.countDocuments();
    const pendingExamsCount = await Exam.countDocuments({ status: 'Active' });

    // Aggregates for scores
    const results = await Result.find();
    let passPercentage = 0;
    let averageScore = 0;

    if (results.length > 0) {
      const passCount = results.filter((r) => r.status === 'Pass').length;
      passPercentage = (passCount / results.length) * 100;

      const sumPercentage = results.reduce((acc, curr) => acc + curr.percentage, 0);
      averageScore = sumPercentage / results.length;
    }

    // Recent Activity (combine recent results & logins)
    const recentSubmissions = await Result.find()
      .populate('candidate', 'name email department')
      .populate('exam', 'title')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentCandidates = await User.find({ role: 'candidate' })
      .sort({ createdAt: -1 })
      .limit(5);

    const recentActivity = [
      ...recentSubmissions.map((s) => ({
        type: 'exam_submitted',
        message: `${s.candidate ? s.candidate.name : 'Unknown Candidate'} completed "${s.exam ? s.exam.title : 'Deleted Exam'}" with score ${s.percentage.toFixed(1)}%`,
        timestamp: s.createdAt,
      })),
      ...recentCandidates.map((c) => ({
        type: 'candidate_created',
        message: `Candidate profile created: ${c.name} (${c.email})`,
        timestamp: c.createdAt,
      })),
    ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 8);

    res.status(200).json({
      success: true,
      stats: {
        totalCandidates,
        todaysExams,
        completedExams: completedExamsCount,
        pendingExams: pendingExamsCount,
        passPercentage: Math.round(passPercentage),
        averageScore: Math.round(averageScore),
        recentActivity,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get candidates (with search, filter, paginate)
 * @route   GET /api/admin/candidates
 * @access  Private (Admin/Superadmin)
 */
const getCandidates = async (req, res, next) => {
  try {
    const { search, department, status } = req.query;

    let query = { role: 'candidate' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (department) {
      query.department = department;
    }

    if (status) {
      query.status = status;
    }

    const candidates = await User.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: candidates.length,
      candidates,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add new candidate manual
 * @route   POST /api/admin/candidates
 * @access  Private (Admin/Superadmin)
 */
const addCandidate = async (req, res, next) => {
  try {
    const { name, email, password, department } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Default password if not provided
    const userPass = password || Math.random().toString(36).slice(-8);

    const candidate = await User.create({
      name,
      email,
      password: userPass,
      department: department || 'General',
      role: 'candidate',
    });

    // Send credentials via email
    const subject = 'Your Stackvil Examination Credentials';
    const text = `Hello ${name},\n\nAn account has been created for you on the Stackvil Exam Portal.\n\nCredentials:\nEmail: ${email}\nPassword: ${userPass}\n\nLink: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n\nGood luck!`;
    const html = `
      <h3>Stackvil Online Examination Portal</h3>
      <p>Hello <strong>${name}</strong>,</p>
      <p>An administrator has registered you for the exam portal.</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px;">
        <p><strong>Login URL:</strong> <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">${process.env.FRONTEND_URL || 'http://localhost:5173'}</a></p>
        <p><strong>Email Address:</strong> ${email}</p>
        <p><strong>Password:</strong> ${userPass}</p>
      </div>
      <p>Please log in and update your password if needed. Good luck with your upcoming exam!</p>
    `;

    await sendEmail({ to: email, subject, text, html });

    res.status(201).json({
      success: true,
      candidate: {
        id: candidate._id,
        name: candidate.name,
        email: candidate.email,
        department: candidate.department,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update candidate details
 * @route   PUT /api/admin/candidates/:id
 * @access  Private (Admin/Superadmin)
 */
const updateCandidate = async (req, res, next) => {
  try {
    const { name, email, department, status, password } = req.body;

    const candidate = await User.findById(req.params.id);

    if (!candidate || candidate.role !== 'candidate') {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    candidate.name = name || candidate.name;
    candidate.email = email || candidate.email;
    candidate.department = department || candidate.department;
    candidate.status = status || candidate.status;

    if (password) {
      candidate.password = password;
    }

    await candidate.save();

    res.status(200).json({
      success: true,
      candidate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete candidate
 * @route   DELETE /api/admin/candidates/:id
 * @access  Private (Admin/Superadmin)
 */
const deleteCandidate = async (req, res, next) => {
  try {
    const candidate = await User.findById(req.params.id);

    if (!candidate || candidate.role !== 'candidate') {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    await User.findByIdAndDelete(req.params.id);
    
    // Clean up related results & logs
    await Result.deleteMany({ candidate: req.params.id });

    res.status(200).json({ success: true, message: 'Candidate profile and related results deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Import candidates in bulk using Excel
 * @route   POST /api/admin/candidates/import
 * @access  Private (Admin/Superadmin)
 */
const importCandidates = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel file' });
    }

    const data = excelToJson(req.file.path);
    const createdUsers = [];
    const skippedUsers = [];

    for (const row of data) {
      const name = row.Name || row.name;
      const email = row.Email || row.email;
      const department = row.Department || row.department || 'General';

      if (!name || !email) {
        skippedUsers.push({ row, reason: 'Name or Email is missing' });
        continue;
      }

      const exists = await User.findOne({ email });
      if (exists) {
        skippedUsers.push({ name, email, reason: 'Email already exists' });
        continue;
      }

      // Generate random password
      const password = Math.random().toString(36).slice(-8);

      const user = await User.create({
        name,
        email,
        password,
        department,
        role: 'candidate',
      });

      // Send email
      const subject = 'Your Stackvil Examination Credentials';
      const text = `Hello ${name},\n\nAn account has been created for you on the Stackvil Exam Portal.\n\nCredentials:\nEmail: ${email}\nPassword: ${password}\n\nGood luck!`;
      const html = `
        <h3>Stackvil Online Examination Portal</h3>
        <p>Hello <strong>${name}</strong>,</p>
        <p>An administrator has registered you via bulk upload.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px;">
          <p><strong>Login URL:</strong> <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">${process.env.FRONTEND_URL || 'http://localhost:5173'}</a></p>
          <p><strong>Email Address:</strong> ${email}</p>
          <p><strong>Password:</strong> ${password}</p>
        </div>
      `;

      await sendEmail({ to: email, subject, text, html });
      createdUsers.push({ name, email, department });
    }

    // Clean up file
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      success: true,
      message: `Successfully imported ${createdUsers.length} candidates.`,
      createdCount: createdUsers.length,
      skippedCount: skippedUsers.length,
      skipped: skippedUsers,
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

/**
 * @desc    Export candidates database to Excel file
 * @route   GET /api/admin/candidates/export
 * @access  Private (Admin/Superadmin)
 */
const exportCandidates = async (req, res, next) => {
  try {
    const candidates = await User.find({ role: 'candidate' }).sort({ createdAt: -1 });

    const data = candidates.map((c) => ({
      ID: c._id.toString(),
      Name: c.name,
      Email: c.email,
      Status: c.status,
      RegisteredAt: c.createdAt.toISOString(),
      LastLogin: c.lastLogin ? c.lastLogin.toISOString() : 'Never',
    }));

    const buffer = jsonToExcel(data, 'Candidates');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Candidates-Export.xlsx');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get portal settings
 * @route   GET /api/admin/settings
 * @access  Private (Admin/Superadmin)
 */
const getSettings = async (req, res, next) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }
    res.status(200).json({ success: true, settings });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update portal settings
 * @route   PUT /api/admin/settings
 * @access  Private (Admin/Superadmin)
 */
const updateSettings = async (req, res, next) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting({});
    }

    const { companyName, smtpHost, smtpPort, smtpUser, smtpPass, passwordLength, requireSpecialChar, theme } = req.body;

    settings.companyName = companyName !== undefined ? companyName : settings.companyName;
    settings.smtpHost = smtpHost !== undefined ? smtpHost : settings.smtpHost;
    settings.smtpPort = smtpPort !== undefined ? smtpPort : settings.smtpPort;
    settings.smtpUser = smtpUser !== undefined ? smtpUser : settings.smtpUser;
    settings.smtpPass = smtpPass !== undefined ? smtpPass : settings.smtpPass;
    settings.passwordLength = passwordLength !== undefined ? passwordLength : settings.passwordLength;
    settings.requireSpecialChar = requireSpecialChar !== undefined ? requireSpecialChar : settings.requireSpecialChar;
    settings.theme = theme !== undefined ? theme : settings.theme;

    if (req.file) {
      settings.companyLogo = `/uploads/images/${req.file.filename}`;
    }

    await settings.save();

    res.status(200).json({ success: true, message: 'Settings updated successfully', settings });
  } catch (error) {
    next(error);
  }
};

// Parser helper for custom PDF exams
const parsePDFQuestionsForCategory = async (filePath, category) => {
  const dataBuffer = fs.readFileSync(filePath);
  
  let text = '';
  if (typeof pdfParse === 'function') {
    const pdfData = await pdfParse(dataBuffer);
    text = pdfData.text || pdfData;
  } else if (pdfParse && typeof pdfParse.PDFParse === 'function') {
    const parser = new pdfParse.PDFParse(new Uint8Array(dataBuffer));
    await parser.load();
    const pdfData = await parser.getText();
    text = typeof pdfData === 'string' ? pdfData : (pdfData && pdfData.text ? pdfData.text : '');
  } else {
    throw new Error('Unsupported pdf-parse module format');
  }

  const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
  const parsedList = [];
  let currentQuestion = null;

  for (let line of lines) {
    const qMatch = line.match(/^(?:Question\s*\d+[\.:\)]+|Q\s*\d+[\.:\)]+|^\d+[\.:\)]+)\s*(.*)/i);
    if (qMatch) {
      if (currentQuestion) {
        parsedList.push(currentQuestion);
      }
      currentQuestion = {
        text: qMatch[1].trim() || line,
        type: 'MCQ',
        options: [],
        correctAnswer: '',
        category: category,
        difficulty: 'Medium',
        marks: 2
      };
      continue;
    }

    const optMatch = line.match(/^(?:[A-D]|[a-d]|\d+)\s*[\.\)]+\s*(.*)/);
    if (optMatch && currentQuestion) {
      currentQuestion.options.push(optMatch[1].trim());
      continue;
    }

    const ansMatch = line.match(/^(?:Correct\s*Answer|Correct|Answer|Key)\s*[:\-=]?\s*(.*)/i);
    if (ansMatch && currentQuestion) {
      currentQuestion.correctAnswer = ansMatch[1].trim();
      continue;
    }

    if (currentQuestion && currentQuestion.options.length === 0) {
      currentQuestion.text += ' ' + line;
    }
  }

  if (currentQuestion) {
    parsedList.push(currentQuestion);
  }

  for (let q of parsedList) {
    if (q.options.length > 0) {
      const ansUpper = q.correctAnswer.toUpperCase();
      if (ansUpper === 'A' && q.options[0]) q.correctAnswer = q.options[0];
      else if (ansUpper === 'B' && q.options[1]) q.correctAnswer = q.options[1];
      else if (ansUpper === 'C' && q.options[2]) q.correctAnswer = q.options[2];
      else if (ansUpper === 'D' && q.options[3]) q.correctAnswer = q.options[3];
    }
  }

  const savedList = [];
  for (const qData of parsedList) {
    const q = await Question.create(qData);
    savedList.push(q);
  }

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  return savedList;
};

/**
 * @desc    Create and assign a custom candidate exam with Aptitude, Technical and Coding rounds
 * @route   POST /api/admin/candidates/:id/create-custom-exam
 * @access  Private (Admin/Superadmin)
 */
const createCustomCandidateExam = async (req, res, next) => {
  try {
    const candidateId = req.params.id;
    const {
      title,
      duration,
      startDate,
      endDate,
      codingTitle,
      codingTemplate,
      codingInput,
      codingOutput,
      codingProjectFiles
    } = req.body;

    const candidate = await User.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    const createdQuestions = [];

    // 1. Aptitude PDF
    if (req.files && req.files.aptitudePdf && req.files.aptitudePdf[0]) {
      const aptFile = req.files.aptitudePdf[0];
      const aptQuestions = await parsePDFQuestionsForCategory(aptFile.path, 'Aptitude');
      createdQuestions.push(...aptQuestions);
    }

    // 2. Technical PDF
    if (req.files && req.files.technicalPdf && req.files.technicalPdf[0]) {
      const techFile = req.files.technicalPdf[0];
      const techQuestions = await parsePDFQuestionsForCategory(techFile.path, 'Technical');
      createdQuestions.push(...techQuestions);
    }

    // 3. Coding Question
    if (codingTitle && codingTemplate) {
      const codingQ = await Question.create({
        text: codingTitle,
        type: 'Coding',
        category: 'Coding',
        difficulty: 'Medium',
        marks: 10,
        correctAnswer: codingTemplate,
        codeTemplates: [
          {
            language: 'javascript',
            template: codingTemplate,
            testCases: [
              {
                input: codingInput || '5',
                output: codingOutput || '120'
              }
            ]
          }
        ]
      });
      createdQuestions.push(codingQ);
    }

    let codingProjectObj = { files: {}, hasProject: false };
    if (codingProjectFiles) {
      try {
        const parsed = typeof codingProjectFiles === 'string' ? JSON.parse(codingProjectFiles) : codingProjectFiles;
        codingProjectObj = {
          files: parsed,
          hasProject: true
        };
      } catch (err) {
        console.error('Failed to parse codingProjectFiles:', err);
      }
    }

    if (createdQuestions.length === 0 && !codingProjectObj.hasProject) {
      return res.status(400).json({ success: false, message: 'Please provide at least one round (Aptitude PDF, Technical PDF, or Coding Project Folder)' });
    }

    // Create the exam mapping
    const exam = await Exam.create({
      title: title || `${candidate.name}'s Custom Assessment`,
      description: `AI-Proctored assessment containing custom Aptitude, Technical and Coding evaluations.`,
      duration: duration ? parseInt(duration) : 60,
      startDate: startDate || new Date(),
      endDate: endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      questions: createdQuestions.map(q => q._id),
      randomizeQuestions: true,
      shuffleOptions: true,
      passingScore: 50,
      assignedCandidates: [candidateId],
      status: 'Draft',
      codingProject: codingProjectObj
    });

    res.status(200).json({
      success: true,
      message: `Successfully saved custom exam with ${createdQuestions.length} questions for ${candidate.name}!`,
      exam
    });
  } catch (error) {
    console.error('Error in createCustomCandidateExam:', error);
    next(error);
  }
};

/**
 * @desc    Schedule/activate a draft exam for candidates
 * @route   PUT /api/admin/exams/:examId/schedule
 * @access  Private (Admin/Superadmin)
 */
const scheduleCandidateExam = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    exam.status = 'Active';
    exam.startDate = new Date();
    await exam.save();

    res.status(200).json({
      success: true,
      message: `Exam "${exam.title}" has been successfully scheduled and activated!`,
      exam
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Force submit a candidate's active exam session
 * @route   POST /api/admin/exams/:examId/force-submit
 * @access  Private (Admin/Superadmin)
 */
const forceSubmitCandidateExam = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { candidateId } = req.body;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const candidate = await User.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    // Check if result already exists
    const existingResult = await Result.findOne({ candidate: candidateId, exam: examId });
    if (existingResult) {
      return res.status(400).json({ success: false, message: 'Exam already submitted' });
    }

    // Retrieve proctor logs warning count
    const ProctorLog = require('../models/ProctorLog');
    const proctorLog = await ProctorLog.findOne({ candidate: candidateId, exam: examId });
    
    let warningsCount = 0;
    if (proctorLog && proctorLog.logs) {
      const activeWarnings = proctorLog.logs.filter((l) => 
        l.type !== 'PeriodicCapture' && l.warningNumber !== undefined
      );
      warningsCount = activeWarnings.length;
    }

    // Create a failed/terminated result document
    const result = await Result.create({
      candidate: candidateId,
      exam: examId,
      responses: [], // empty responses as they were force terminated
      score: 0,
      percentage: 0,
      status: 'Fail',
      totalTimeTaken: 0,
      warningsCount: warningsCount,
    });

    res.status(200).json({
      success: true,
      message: `Exam session for ${candidate.name} has been terminated and submitted.`,
      result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset entire database and seed default values
 * @route   POST /api/admin/reset-database
 * @access  Private (Admin/Superadmin)
 */
const resetDatabase = async (req, res, next) => {
  try {
    // 1. Clear all collections
    await User.deleteMany();
    await Question.deleteMany();
    await Exam.deleteMany();
    await Setting.deleteMany();
    await Result.deleteMany();
    
    // Lazy load ProctorLog model to avoid circular/missing dependencies
    const ProctorLog = require('../models/ProctorLog');
    await ProctorLog.deleteMany();

    // 2. Create Portal Settings
    await Setting.create({
      companyName: 'Stackvil Solutions',
      companyLogo: '',
      smtpHost: 'smtp.mailtrap.io',
      smtpPort: 2525,
      smtpUser: '',
      smtpPass: '',
      passwordLength: 8,
      requireSpecialChar: true,
      theme: 'light',
    });

    // 3. Create Default Users
    await User.create({
      name: 'Stackvil Super Admin',
      email: 'admin@stackvil.com',
      password: 'password123',
      role: 'superadmin',
      department: 'IT Administration',
    });

    await User.create({
      name: 'Stackvil HR Team',
      email: 'hr@stackvil.com',
      password: 'password123',
      role: 'admin',
      department: 'Human Resources',
    });

    // 4. Create Question Bank
    const q1 = await Question.create({
      text: 'Which programming language is predominantly used for frontend development in React applications?',
      type: 'MCQ',
      options: ['Python', 'C++', 'Java', 'JavaScript'],
      correctAnswer: 'JavaScript',
      category: 'Frontend Engineering',
      difficulty: 'Easy',
      marks: 1,
    });

    const q2 = await Question.create({
      text: 'Identify all NoSQL databases from the options below. (Select all that apply)',
      type: 'Checkbox',
      options: ['MySQL', 'MongoDB', 'PostgreSQL', 'Redis'],
      correctAnswer: ['MongoDB', 'Redis'],
      category: 'Databases',
      difficulty: 'Medium',
      marks: 2,
    });

    const q3 = await Question.create({
      text: 'HTTP stands for Hypertext Transfer Protocol and is stateful by default.',
      type: 'True/False',
      options: ['True', 'False'],
      correctAnswer: 'False',
      category: 'Networking',
      difficulty: 'Easy',
      marks: 1,
    });

    const q4 = await Question.create({
      text: 'Explain briefly the concept and benefits of Virtual DOM in modern UI frameworks like React.',
      type: 'Paragraph',
      correctAnswer: 'react handles reconciliation using virtual dom updates',
      category: 'Frontend Engineering',
      difficulty: 'Medium',
      marks: 3,
    });

    const q5 = await Question.create({
      text: 'Write a JavaScript function named "add" that accepts two numeric arguments (a, b) and returns their sum.',
      type: 'Coding',
      correctAnswer: 'function add(a, b) {\n  return a + b;\n}',
      codeTemplates: [
        {
          language: 'javascript',
          template: 'function add(a, b) {\n  // Write your code here\n}',
          testCases: [
            { input: '5, 10', output: '15' },
            { input: '-1, 2', output: '1' },
          ],
        },
      ],
      category: 'Coding Assessment',
      difficulty: 'Medium',
      marks: 5,
    });

    // 5. Create active evaluation exam
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const exam = await Exam.create({
      title: 'Full Stack Engineer Evaluation',
      description: 'Pre-employment screening exam evaluating JavaScript expertise, database knowledge, web systems theory, and coding execution speed.',
      duration: 45,
      startDate: today,
      endDate: nextWeek,
      questions: [q1._id, q2._id, q3._id, q4._id, q5._id],
      randomizeQuestions: false,
      shuffleOptions: false,
      passingScore: 60,
      assignedCandidates: [],
      status: 'Active',
    });

    res.status(200).json({
      success: true,
      message: 'Database has been successfully cleared and reset to default seed values!',
      exam,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
