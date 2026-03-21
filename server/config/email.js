const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Create email transporter
const createTransporter = () => {
  const config = {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  };

  try {
    const transporter = nodemailer.createTransport(config);
    
    // Verify connection configuration
    transporter.verify((error, success) => {
      if (error) {
        logger.error('Email transporter verification failed:', error);
      } else {
        logger.info('✅ Email server is ready to send messages');
      }
    });

    return transporter;
  } catch (error) {
    logger.error('Error creating email transporter:', error);
    return null;
  }
};

// Email templates
const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to Smart Medicine Reminder',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Smart Medicine Reminder! 💊</h1>
          </div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <p>Thank you for joining Smart Medicine Reminder. We're here to help you stay on top of your medication schedule.</p>
            <p><strong>Key Features:</strong></p>
            <ul>
              <li>📅 Personalized medication schedules</li>
              <li>🔔 Timely reminders via push notifications and email</li>
              <li>📊 Track your medication adherence</li>
              <li>👨‍⚕️ Book online consultations with doctors</li>
              <li>📁 Secure storage of health records</li>
            </ul>
            <p>Get started by setting up your first medication schedule in the app!</p>
            <div class="footer">
              <p>Smart Medicine Reminder System © 2024</p>
              <p>If you have any questions, please contact our support team.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  medicineReminder: (name, medicineName, time, dosage) => ({
    subject: `⏰ Reminder: Time to take ${medicineName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .medicine-info { background: white; padding: 20px; border-left: 4px solid #4CAF50; margin: 20px 0; }
          .urgent { color: #f44336; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Medicine Reminder</h1>
          </div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <p class="urgent">It's time to take your medication!</p>
            <div class="medicine-info">
              <h3>💊 ${medicineName}</h3>
              <p><strong>Scheduled Time:</strong> ${time}</p>
              <p><strong>Dosage:</strong> ${dosage}</p>
            </div>
            <p><strong>Important:</strong> Please take your medication as prescribed. If you've already taken it, please mark it as taken in the app.</p>
            <p>Stay healthy! 💚</p>
            <div class="footer">
              <p>Smart Medicine Reminder System</p>
              <p>This is an automated reminder. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  missedDose: (name, medicineName, time) => ({
    subject: `⚠️ Missed Dose Alert: ${medicineName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff9800; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #fff3e0; padding: 30px; border-radius: 0 0 10px 10px; }
          .alert { background: #fff; padding: 20px; border-left: 4px solid #ff9800; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Missed Dose Alert</h1>
          </div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <p>We noticed you may have missed a dose of your medication.</p>
            <div class="alert">
              <h3>💊 ${medicineName}</h3>
              <p><strong>Scheduled Time:</strong> ${time}</p>
              <p><strong>Status:</strong> Not taken</p>
            </div>
            <p><strong>What to do:</strong></p>
            <ul>
              <li>If you've already taken it, please mark it in the app</li>
              <li>If you missed it, consult your doctor before taking a late dose</li>
              <li>Never take a double dose to make up for a missed one</li>
            </ul>
            <p>Your health is important to us! 💙</p>
            <div class="footer">
              <p>Smart Medicine Reminder System</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  refillAlert: (name, medicineName, remainingDoses) => ({
    subject: `📦 Refill Alert: ${medicineName} running low`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #e3f2fd; padding: 30px; border-radius: 0 0 10px 10px; }
          .refill-info { background: white; padding: 20px; border-left: 4px solid #2196F3; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📦 Refill Reminder</h1>
          </div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <p>Your medication supply is running low!</p>
            <div class="refill-info">
              <h3>💊 ${medicineName}</h3>
              <p><strong>Remaining Doses:</strong> ${remainingDoses}</p>
              <p><strong>Action Required:</strong> Order refill soon</p>
            </div>
            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Contact your pharmacy for a refill</li>
              <li>Check if you need a new prescription from your doctor</li>
              <li>Update your stock count in the app after refilling</li>
            </ul>
            <p>Don't run out of your essential medication! 💊</p>
            <div class="footer">
              <p>Smart Medicine Reminder System</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  appointmentConfirmation: (name, doctorName, appointmentDate, appointmentTime) => ({
    subject: `✅ Appointment Confirmed with Dr. ${doctorName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #9C27B0; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f3e5f5; padding: 30px; border-radius: 0 0 10px 10px; }
          .appointment-info { background: white; padding: 20px; border-left: 4px solid #9C27B0; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Appointment Confirmed</h1>
          </div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <p>Your appointment has been successfully scheduled!</p>
            <div class="appointment-info">
              <h3>👨‍⚕️ Dr. ${doctorName}</h3>
              <p><strong>Date:</strong> ${appointmentDate}</p>
              <p><strong>Time:</strong> ${appointmentTime}</p>
            </div>
            <p><strong>Before your appointment:</strong></p>
            <ul>
              <li>Prepare a list of questions or concerns</li>
              <li>Bring your health records if needed</li>
              <li>Log in to the app 5 minutes before the scheduled time</li>
            </ul>
            <p>We look forward to your consultation! 👨‍⚕️</p>
            <div class="footer">
              <p>Smart Medicine Reminder System</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  passwordReset: (name, resetLink) => ({
    subject: '🔒 Password Reset Request',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f44336; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #ffebee; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #f44336; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Reset</h1>
          </div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </p>
            <p><strong>Note:</strong> This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
            <div class="footer">
              <p>Smart Medicine Reminder System</p>
              <p>For security reasons, never share this email with anyone.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

module.exports = {
  createTransporter,
  emailTemplates
};