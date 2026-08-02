const nodemailer = require('nodemailer');

const getTransporter = async () => {
  // We dynamically require the Setting model to avoid circular dependency issues
  const Setting = require('../models/Setting');

  let config = {
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT) || 2525,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  };

  try {
    const settings = await Setting.findOne();
    if (settings && settings.smtpHost) {
      config = {
        host: settings.smtpHost,
        port: settings.smtpPort || 587,
        auth: {
          user: settings.smtpUser || '',
          pass: settings.smtpPass || '',
        },
      };
    }
  } catch (error) {
    console.error('Error fetching SMTP settings from database, using env:', error.message);
  }

  return nodemailer.createTransport(config);
};

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const transporter = await getTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@stackvil.com',
      to,
      subject,
      text,
      html,
    };

    if (!transporter.options.auth.user) {
      console.log(`\n==================================================`);
      console.log(`[EMAIL SIMULATION]`);
      console.log(`To:      ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body:    ${text}`);
      console.log(`==================================================\n`);
      return { message: 'Email simulated successfully (SMTP credentials missing).' };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Email send error: ${error.message}`);
    // Log fallback content and don't fail the execution flow
    console.log(`\n==================================================`);
    console.log(`[EMAIL SIMULATION FALLBACK]`);
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:    ${text}`);
    console.log(`==================================================\n`);
    return { error: error.message, simulated: true };
  }
};

module.exports = { sendEmail };
