const mongoose = require('mongoose');

const proctorLogSchema = new mongoose.Schema(
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
    logs: [
      {
        type: {
          type: String,
          enum: [
            'TabSwitch',
            'FullscreenExit',
            'FaceNotDetected',
            'MultipleFaces',
            'LookingAway',
            'CameraDisabled',
            'MicDisabled',
            'InternetDisconnect',
          ],
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        imagePath: {
          type: String, // Server relative path to file uploaded by Multer
        },
        warningNumber: {
          type: Number,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Unique log collection per candidate per exam
proctorLogSchema.index({ candidate: 1, exam: 1 }, { unique: true });

module.exports = mongoose.model('ProctorLog', proctorLogSchema);
