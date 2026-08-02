const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      default: 'Stackvil',
    },
    companyLogo: {
      type: String, // Path or URL to logo
      default: '',
    },
    smtpHost: {
      type: String,
      default: '',
    },
    smtpPort: {
      type: Number,
      default: 587,
    },
    smtpUser: {
      type: String,
      default: '',
    },
    smtpPass: {
      type: String,
      default: '',
    },
    passwordLength: {
      type: Number,
      default: 8,
    },
    requireSpecialChar: {
      type: Boolean,
      default: true,
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Setting', settingSchema);
