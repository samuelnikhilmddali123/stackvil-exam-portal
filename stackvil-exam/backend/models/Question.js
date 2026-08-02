const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Please add question text'],
    },
    type: {
      type: String,
      required: [true, 'Please specify question type'],
      enum: ['MCQ', 'Checkbox', 'True/False', 'Paragraph', 'Image', 'Coding'],
    },
    options: {
      type: [String], // Used for MCQ, Checkbox, True/False
      default: [],
    },
    correctAnswer: {
      type: mongoose.Schema.Types.Mixed, // String, Array, or Boolean depending on type
      required: [true, 'Please add the correct answer'],
    },
    imageUrl: {
      type: String, // Used for Image based questions
    },
    codeTemplates: [
      {
        language: {
          type: String,
          enum: ['c', 'cpp', 'java', 'python', 'javascript', 'nodejs'],
        },
        template: String,
        testCases: [
          {
            input: String,
            output: String,
          },
        ],
      },
    ],
    category: {
      type: String,
      required: [true, 'Please specify category/subject'],
      default: 'General',
    },
    difficulty: {
      type: String,
      required: [true, 'Please specify difficulty level'],
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium',
    },
    marks: {
      type: Number,
      required: [true, 'Please assign marks'],
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Question', questionSchema);
