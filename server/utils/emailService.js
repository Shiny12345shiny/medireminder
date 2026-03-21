const { createTransporter, emailTemplates } = require('../config/email');
const logger = require('./logger');

// Send email utility
const sendEmail = async (to, subject, html, from = null) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      logger.error('Email transporter not configured');
      return { success: false, error: 'Email service not configured' };
    }

    const mailOptions = {
      from: from || process.env.EMAIL_FROM || `"Smart Medicine Reminder" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    
    logger.logNotification('email', to, 'sent', {
      messageId: info.messageId,
      subject
    });

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    logger.error('Error sending email:', error);
    logger.logNotification('email', to, 'failed', {
      subject,
      error: error.message
    });

    return {
      success: false,
      error: error.message
    };
  }
};

// Send welcome email
const sendWelcomeEmail = async (user) => {
  const template = emailTemplates.welcome(user.name);
  return await sendEmail(user.email, template.subject, template.html);
};

// Send medicine reminder email
const sendMedicineReminderEmail = async (user, medicine) => {
  const template = emailTemplates.medicineReminder(
    user.name,
    medicine.medicineName,
    medicine.time,
    `${medicine.dosage.amount} ${medicine.dosage.unit}`
  );
  return await sendEmail(user.email, template.subject, template.html);
};

// Send missed dose alert email
const sendMissedDoseEmail = async (user, medicine) => {
  const template = emailTemplates.missedDose(
    user.name,
    medicine.medicineName,
    medicine.time
  );
  return await sendEmail(user.email, template.subject, template.html);
};

// Send refill alert email
const sendRefillAlertEmail = async (user, medicine, remainingDoses) => {
  const template = emailTemplates.refillAlert(
    user.name,
    medicine.medicineName,
    remainingDoses
  );
  return await sendEmail(user.email, template.subject, template.html);
};

// Send appointment confirmation email
const sendAppointmentConfirmationEmail = async (user, appointment) => {
  const appointmentDate = new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const template = emailTemplates.appointmentConfirmation(
    user.name,
    appointment.doctor.name || appointment.doctorName,
    appointmentDate,
    appointment.appointmentTime
  );
  return await sendEmail(user.email, template.subject, template.html);
};

// Send password reset email
const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const template = emailTemplates.passwordReset(user.name, resetUrl);
  return await sendEmail(user.email, template.subject, template.html);
};

// Send email verification
const sendVerificationEmail = async (user, verificationToken) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .button { display: inline-block; padding: 12px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Verify Your Email</h1>
        </div>
        <div class="content">
          <h2>Hello ${user.name},</h2>
          <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
          <p style="text-align: center;">
            <a href="${verifyUrl}" class="button">Verify Email</a>
          </p>
          <p>Or copy and paste this link: ${verifyUrl}</p>
          <p>This link will expire in 24 hours.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(user.email, 'Verify Your Email - Smart Medicine Reminder', html);
};

// Send appointment reminder email
const sendAppointmentReminderEmail = async (user, appointment, hoursUntil) => {
  const appointmentDate = new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #9C27B0; color: white; padding: 20px; text-align: center; }
        .content { background: #f3e5f5; padding: 30px; }
        .reminder-box { background: white; padding: 20px; border-left: 4px solid #9C27B0; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ Appointment Reminder</h1>
        </div>
        <div class="content">
          <h2>Hello ${user.name},</h2>
          <p>This is a reminder that you have an upcoming appointment in ${hoursUntil} hours.</p>
          <div class="reminder-box">
            <h3>👨‍⚕️ Dr. ${appointment.doctor.name}</h3>
            <p><strong>Date:</strong> ${appointmentDate}</p>
            <p><strong>Time:</strong> ${appointment.appointmentTime}</p>
            <p><strong>Type:</strong> ${appointment.consultationType}</p>
          </div>
          <p>Please be ready 5 minutes before the scheduled time.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(user.email, `Appointment Reminder - ${hoursUntil}h`, html);
};

// Send bulk emails (with rate limiting)
const sendBulkEmails = async (recipients, subject, html, batchSize = 10, delayMs = 1000) => {
  const results = {
    success: [],
    failed: []
  };

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (recipient) => {
      const result = await sendEmail(recipient.email, subject, html);
      
      if (result.success) {
        results.success.push(recipient.email);
      } else {
        results.failed.push({
          email: recipient.email,
          error: result.error
        });
      }
    });

    await Promise.allSettled(batchPromises);

    // Delay between batches to avoid rate limiting
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  logger.info('Bulk email send completed', {
    total: recipients.length,
    successful: results.success.length,
    failed: results.failed.length
  });

  return results;
};

// Send test email
const sendTestEmail = async (to) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 30px; border-radius: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>✅ Email Service Test</h1>
        <p>This is a test email from Smart Medicine Reminder System.</p>
        <p>If you receive this email, your email configuration is working correctly!</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(to, 'Test Email - Smart Medicine Reminder', html);
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendMedicineReminderEmail,
  sendMissedDoseEmail,
  sendRefillAlertEmail,
  sendAppointmentConfirmationEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendAppointmentReminderEmail,
  sendBulkEmails,
  sendTestEmail
};