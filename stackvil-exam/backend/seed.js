require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Question = require('./models/Question');
const Exam = require('./models/Exam');
const Setting = require('./models/Setting');
const Result = require('./models/Result');
const ProctorLog = require('./models/ProctorLog');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stackvil-exam');
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany();
    await Question.deleteMany();
    await Exam.deleteMany();
    await Setting.deleteMany();
    await Result.deleteMany();
    await ProctorLog.deleteMany();
    console.log('Database cleared.');

    // 1. Create Portal Settings
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
    console.log('Default settings seeded.');

    // 2. Create Users
    const superAdmin = await User.create({
      name: 'Stackvil Super Admin',
      email: 'admin@stackvil.com',
      password: 'password123',
      role: 'superadmin',
      department: 'IT Administration',
    });

    const hrAdmin = await User.create({
      name: 'Stackvil HR Team',
      email: 'hr@stackvil.com',
      password: 'password123',
      role: 'admin',
      department: 'Human Resources',
    });

    console.log('Users (SuperAdmin, Admin) seeded.');

    // 3. Create Question Bank
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

    console.log('Question Bank seeded.');

    // 4. Create an Exam
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const exam = await Exam.create({
      title: 'Full Stack Engineer Evaluation',
      description: 'Pre-employment screening exam evaluating JavaScript expertise, database knowledge, web systems theory, and coding execution speed.',
      duration: 45, // 45 minutes
      startDate: today,
      endDate: nextWeek,
      questions: [q1._id, q2._id, q3._id, q4._id, q5._id],
      randomizeQuestions: false,
      shuffleOptions: false,
      passingScore: 60, // 60%
      assignedCandidates: [],
      status: 'Active',
    });

    console.log(`Exam "${exam.title}" created and active.`);
    console.log('Seeding finished successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
