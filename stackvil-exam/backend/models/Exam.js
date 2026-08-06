const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add an exam title'],
      trim: true,
    },
    description: {
      type: String,
    },
    duration: {
      type: Number, // In minutes
      required: [true, 'Please specify the exam duration in minutes'],
    },
    startDate: {
      type: Date,
      required: [true, 'Please specify the start date/time'],
    },
    endDate: {
      type: Date,
      required: [true, 'Please specify the end date/time'],
    },
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],
    randomizeQuestions: {
      type: Boolean,
      default: false,
    },
    shuffleOptions: {
      type: Boolean,
      default: false,
    },
    passingScore: {
      type: Number,
      default: 40, // Percentage
    },
    assignedCandidates: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['Draft', 'Active', 'Completed'],
      default: 'Draft',
    },
    codingProject: {
      files: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      },
      hasProject: {
        type: Boolean,
        default: false
      }
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Exam', examSchema);
