const nodemailer = require('nodemailer');
const { logger } = require('../src/config/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      logger.info('Email service initialized');
    }
  }

  async sendEmail(to, subject, html, text = null) {
    if (!this.transporter) {
      logger.warn('Email service not configured');
      return;
    }

    try {
      const mailOptions = {
        from: `Construction Portal <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent to ${to}: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error('Email send error:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(email, username) {
    const html = `
      <h1>Welcome to Construction Material Portal</h1>
      <p>Hi ${username},</p>
      <p>Welcome to the Construction Material Price Comparison Portal!</p>
      <p>You can now:</p>
      <ul>
        <li>Compare material prices across suppliers</li>
        <li>Discover verified suppliers</li>
        <li>Save your favorite suppliers</li>
        <li>Get price alerts</li>
      </ul>
      <a href="${process.env.FRONTEND_URL}">Get Started</a>
    `;
    return this.sendEmail(email, 'Welcome to Construction Portal', html);
  }

  async sendPasswordResetEmail(email, resetToken) {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const html = `
      <h1>Reset Your Password</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;
    return this.sendEmail(email, 'Reset Your Password', html);
  }

  async sendInquiryNotification(email, inquiryData) {
    const html = `
      <h1>New Inquiry Received</h1>
      <p>You have received a new inquiry for ${inquiryData.materialName}</p>
      <p>Quantity: ${inquiryData.quantity}</p>
      <p>Message: ${inquiryData.message}</p>
      <a href="${process.env.FRONTEND_URL}/inquiries/${inquiryData.id}">View Inquiry</a>
    `;
    return this.sendEmail(email, 'New Inquiry Received', html);
  }

  async sendPriceAlert(email, alertData) {
    const html = `
      <h1>Price Alert</h1>
      <p>${alertData.materialName} price has changed!</p>
      <p>Previous Price: ₹${alertData.oldPrice}</p>
      <p>New Price: ₹${alertData.newPrice}</p>
      <p>Supplier: ${alertData.supplierName}</p>
      <a href="${process.env.FRONTEND_URL}/materials/${alertData.materialId}">View Material</a>
    `;
    return this.sendEmail(email, 'Price Alert', html);
  }
}

module.exports = new EmailService();