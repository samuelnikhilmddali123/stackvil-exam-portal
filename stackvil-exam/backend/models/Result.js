const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    responses: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Question',
          required: true,
        },
        answer: {
          type: mongoose.Schema.Types.Mixed, // The actual candidate response
        },
        isCorrect: {
          type: Boolean,
          default: false,
        },
        marksObtained: {
          type: Number,
          default: 0,
        },
        timeSpent: {
          type: Number, // Time spent in seconds on this question
          default: 0,
        },
      },
    ],
    score: {
      type: Number,
      required: true,
      default: 0,
    },
    percentage: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Pass', 'Fail'],
      required: true,
    },
    rank: {
      type: Number,
    },
    totalTimeTaken: {
      type: Number, // Total duration in seconds
      default: 0,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    warningsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate results for the same candidate taking the same exam
resultSchema.index({ candidate: 1, exam: 1 }, { unique: true });

module.exports = mongoose.model('Result', resultSchema);
