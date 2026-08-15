const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
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
});

const roundSchema = new mongoose.Schema({
  responses: [responseSchema],
  startTime: {
    type: Date,
  },
  score: {
    type: Number,
    default: 0,
  },
  percentage: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Pass', 'Fail', 'Pending'],
    default: 'Pending',
  },
  completed: {
    type: Boolean,
    default: false,
  },
  completedTime: {
    type: Date,
  },
  totalTimeTaken: {
    type: Number, // In seconds
    default: 0,
  },
});

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
    // Top-level overall fields for compatibility with reports, Excel, and PDF generators
    responses: [responseSchema],
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
      enum: ['Pass', 'Fail', 'Pending'],
      default: 'Pending',
      required: true,
    },
    totalTimeTaken: {
      type: Number, // Total duration in seconds
      default: 0,
    },
    warningsCount: {
      type: Number,
      default: 0,
    },
    isDisqualified: {
      type: Boolean,
      default: false,
    },
    disqualificationReason: {
      type: String,
      default: '',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },

    // Round-specific tracking
    round1: {
      type: roundSchema,
      default: () => ({}),
    },
    round2: {
      type: roundSchema,
      default: () => ({}),
    },
    round3: {
      type: new mongoose.Schema({
        files: {
          type: mongoose.Schema.Types.Mixed,
          default: {}
        },
        startTime: Date,
        completed: {
          type: Boolean,
          default: false
        },
        completedTime: Date,
        score: {
          type: Number,
          default: 0
        },
        percentage: {
          type: Number,
          default: 0
        },
        status: {
          type: String,
          enum: ['Pass', 'Fail', 'Pending'],
          default: 'Pending'
        },
        totalTimeTaken: {
          type: Number,
          default: 0
        }
      }),
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate results for the same candidate taking the same exam
resultSchema.index({ candidate: 1, exam: 1 }, { unique: true });

module.exports = mongoose.model('Result', resultSchema);
