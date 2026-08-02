const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../config/mailer');

// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_jwt_key_stackvil_exam_2026', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if account active
    if (user.status === 'inactive') {
      return res.status(403).json({ success: false, message: 'Your account is deactivated' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Send token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot Password - Send OTP to user
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found with this email' });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Save to user model
    user.otp = {
      code: otpCode,
      expiresAt: otpExpires,
    };
    await user.save();

    // Send via email
    const subject = 'Password Reset OTP - Stackvil Portal';
    const text = `Your password reset OTP is ${otpCode}. It will expire in 10 minutes.`;
    const html = `
      <h3>Stackvil Online Examination Portal</h3>
      <p>You requested a password reset. Use the following One-Time Password (OTP) to reset it:</p>
      <h2 style="color: #1e3a8a; letter-spacing: 2px;">${otpCode}</h2>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    `;

    await sendEmail({ to: user.email, subject, text, html });

    res.status(200).json({ success: true, message: 'OTP sent to your email address' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset Password using OTP
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide all details' });
    }

    const user = await User.findOne({
      email,
      'otp.code': otp,
      'otp.expiresAt': { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code' });
    }

    // Reset password (triggers pre-save hook)
    user.password = newPassword;
    user.otp = undefined; // Clear OTP
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successful. You can log in now.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  forgotPassword,
  resetPassword,
  getMe,
};
