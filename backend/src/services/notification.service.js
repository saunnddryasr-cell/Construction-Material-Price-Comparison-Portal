const User = require('../models/User.model');
const { logger } = require('../config/logger');
const emailService = require('./email.service');

class NotificationService {
  async sendPriceAlert(userId, alertData) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.preferences.notifications) {
        return;
      }

      await emailService.sendPriceAlert(user.email, alertData);
      
      logger.info(`Price alert sent to user ${userId}`);
    } catch (error) {
      logger.error('Price alert error:', error);
    }
  }

  async sendInquiryResponse(userId, inquiryId, responseMessage) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return;
      }

      const html = `
        <h1>Inquiry Response Received</h1>
        <p>Your inquiry (ID: ${inquiryId}) has received a response.</p>
        <p>Response: ${responseMessage}</p>
        <a href="${process.env.FRONTEND_URL}/inquiries/${inquiryId}">View Inquiry</a>
      `;

      await emailService.sendEmail(
        user.email,
        'Inquiry Response',
        html
      );

      logger.info(`Inquiry response notification sent to user ${userId}`);
    } catch (error) {
      logger.error('Inquiry response notification error:', error);
    }
  }

  async sendSupplierVerification(supplierId, isVerified) {
    try {
      const supplier = await User.findById(supplierId);
      if (!supplier) {
        return;
      }

      const status = isVerified ? 'verified' : 'unverified';
      const html = `
        <h1>Account Verification Update</h1>
        <p>Your supplier account has been ${status}.</p>
        ${isVerified ? `
          <p>You can now:</p>
          <ul>
            <li>Update prices for all materials</li>
            <li>Receive inquiries from contractors</li>
            <li>Build your reputation on the platform</li>
          </ul>
        ` : `
          <p>Please contact support for more information.</p>
        `}
        <a href="${process.env.FRONTEND_URL}/dashboard">Go to Dashboard</a>
      `;

      await emailService.sendEmail(
        supplier.email,
        `Account ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        html
      );

      logger.info(`Supplier verification notification sent to ${supplierId}`);
    } catch (error) {
      logger.error('Supplier verification notification error:', error);
    }
  }
}

module.exports = new NotificationService();