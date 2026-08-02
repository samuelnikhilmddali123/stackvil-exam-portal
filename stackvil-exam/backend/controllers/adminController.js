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
    text = pdfData.text;
  } else if (pdfParse.PDFParse) {
    const parser = new pdfParse.PDFParse(new Uint8Array(dataBuffer));
    const pdfData = await parser.getText();
    text = pdfData.text;
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
      codingOutput
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

    if (createdQuestions.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide at least one round (Aptitude PDF, Technical PDF, or Coding Question)' });
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
      status: 'Active'
    });

    res.status(200).json({
      success: true,
      message: `Successfully scheduled custom exam with ${createdQuestions.length} questions for ${candidate.name}!`,
      exam
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
};
