const cron = require('node-cron');
const mongoose = require('mongoose');
const { logger } = require('../src/config/logger');
const User = require('../src/models/User.model');
const Price = require('../src/models/Price.model');
const Material = require('../src/models/Material.model');
const Inquiry = require('../src/models/Inquiry.model');
const emailService = require('../src/services/email.service');

class NotificationJob {
  constructor() {
    this.isRunning = false;
  }

  // Start all notification jobs
  start() {
    // Check for price alerts - runs every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      await this.checkPriceAlerts();
    });

    // Check for pending inquiries - runs every 2 hours
    cron.schedule('0 */2 * * *', async () => {
      await this.checkPendingInquiries();
    });

    // Send weekly digest - runs every Monday at 8 AM
    cron.schedule('0 8 * * 1', async () => {
      await this.sendWeeklyDigest();
    });

    // Check for inactive suppliers - runs daily at 3 AM
    cron.schedule('0 3 * * *', async () => {
      await this.checkInactiveSuppliers();
    });

    // Send price update notifications - runs every 4 hours
    cron.schedule('0 */4 * * *', async () => {
      await this.sendPriceUpdateNotifications();
    });

    logger.info('Notification jobs scheduled');
  }

  // Check price alerts for users
  async checkPriceAlerts() {
    if (this.isRunning) {
      logger.warn('Price alert check already running');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Checking price alerts...');

      // Find all users with active price alerts
      const users = await User.find({
        'preferences.priceAlerts': { $exists: true, $not: { $size: 0 } },
        'preferences.priceAlerts.isActive': true,
        isActive: true,
      });

      let alertsTriggered = 0;

      for (const user of users) {
        const activeAlerts = user.preferences.priceAlerts.filter(
          alert => alert.isActive
        );

        for (const alert of activeAlerts) {
          // Get current price for the material
          const price = await Price.findOne({
            materialId: alert.materialId,
            isActive: true,
            stockQuantity: { $gt: 0 },
          })
          .sort({ lastUpdated: -1 })
          .populate('materialId', 'name category unit')
          .populate('supplierId', 'profile.companyName');

          if (!price) continue;

          // Check if price is below target
          if (price.price <= alert.targetPrice) {
            // Check if we already sent a notification for this price drop
            const lastNotificationKey = `price_alert_${user._id}_${alert.materialId}`;
            // In production, store this in a separate collection or cache
            
            // Send notification
            await this.sendPriceAlertNotification(user, price, alert.targetPrice);
            
            // Mark alert as inactive or update last notified price
            alert.isActive = false; // Optional: deactivate after triggering
            alertsTriggered++;
          }
        }

        await user.save();
      }

      const duration = Date.now() - startTime;
      logger.info(`Price alert check completed: ${alertsTriggered} alerts triggered in ${duration}ms`);

    } catch (error) {
      logger.error('Price alert check failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Send price alert notification
  async sendPriceAlertNotification(user, price, targetPrice) {
    try {
      const material = price.materialId;
      const supplier = price.supplierId;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .price-box { background: #f0fdf4; border: 1px solid #86efac; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .price { font-size: 24px; font-weight: bold; color: #16a34a; }
            .target { font-size: 18px; color: #6b7280; }
            .button { display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Price Alert!</h1>
            </div>
            <div class="content">
              <p>Hi ${user.username},</p>
              <p>Great news! The price for <strong>${material.name}</strong> has dropped below your target price!</p>
              
              <div class="price-box">
                <p><strong>Current Price:</strong> <span class="price">₹${price.price}</span></p>
                <p><strong>Your Target:</strong> <span class="target">₹${targetPrice}</span></p>
                <p><strong>Supplier:</strong> ${supplier.profile.companyName}</p>
                <p><strong>Unit:</strong> ${price.unit}</p>
                <p><strong>Location:</strong> ${price.location.city}, ${price.location.state}</p>
              </div>

              <p>This is a great opportunity to save money on your procurement!</p>
              
              <a href="${process.env.FRONTEND_URL}/materials/${material._id}" class="button">View Material</a>
            </div>
          </div>
        </body>
        </html>
      `;

      await emailService.sendEmail(
        user.email,
        `🎯 Price Alert: ${material.name} dropped to ₹${price.price}`,
        emailHtml
      );

      logger.info(`Price alert sent to ${user.email} for ${material.name}`);

    } catch (error) {
      logger.error('Failed to send price alert notification:', error);
    }
  }

  // Check pending inquiries
  async checkPendingInquiries() {
    try {
      logger.info('Checking pending inquiries...');

      // Find inquiries that have been pending for more than 24 hours
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - 24);

      const pendingInquiries = await Inquiry.find({
        status: 'pending',
        createdAt: { $lt: cutoffTime },
      })
      .populate('materialId', 'name category unit')
      .populate('userId', 'username email profile.companyName')
      .populate('supplierId', 'username email profile.companyName');

      if (pendingInquiries.length === 0) {
        logger.info('No pending inquiries found');
        return;
      }

      // Group by supplier
      const supplierMap = {};
      for (const inquiry of pendingInquiries) {
        const supplierId = inquiry.supplierId._id.toString();
        if (!supplierMap[supplierId]) {
          supplierMap[supplierId] = {
            supplier: inquiry.supplierId,
            inquiries: [],
          };
        }
        supplierMap[supplierId].inquiries.push(inquiry);
      }

      // Send reminders to suppliers
      for (const [supplierId, data] of Object.entries(supplierMap)) {
        await this.sendPendingInquiryReminder(data.supplier, data.inquiries);
      }

      logger.info(`Sent reminders for ${pendingInquiries.length} pending inquiries`);

    } catch (error) {
      logger.error('Pending inquiry check failed:', error);
    }
  }

  // Send pending inquiry reminder
  async sendPendingInquiryReminder(supplier, inquiries) {
    try {
      const inquiryList = inquiries.map(inquiry => 
        `- ${inquiry.materialId.name} (${inquiry.quantity} ${inquiry.unit || 'units'}) - ${inquiry.userId.profile.companyName || inquiry.userId.username}`
      ).join('\n');

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .inquiry-list { background: #f3f4f6; padding: 15px; border-radius: 8px; }
            .button { display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Pending Inquiry Reminder</h1>
            </div>
            <div class="content">
              <p>Hi ${supplier.profile.companyName || supplier.username},</p>
              <p>You have <strong>${inquiries.length}</strong> pending inquiry(s) that have been waiting for more than 24 hours:</p>
              
              <div class="inquiry-list">
                <pre>${inquiryList}</pre>
              </div>

              <p>Please respond to these inquiries to help your customers make informed decisions.</p>
              
              <a href="${process.env.FRONTEND_URL}/supplier/inquiries" class="button">View Inquiries</a>
            </div>
          </div>
        </body>
        </html>
      `;

      await emailService.sendEmail(
        supplier.email,
        `⏰ ${inquiries.length} Pending Inquiry Reminder`,
        emailHtml
      );

      logger.info(`Pending inquiry reminder sent to ${supplier.email}`);

    } catch (error) {
      logger.error('Failed to send pending inquiry reminder:', error);
    }
  }

  // Send weekly digest to users
  async sendWeeklyDigest() {
    try {
      logger.info('Sending weekly digest...');

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      // Find active users
      const users = await User.find({
        isActive: true,
        'preferences.notifications': true,
      });

      let sentCount = 0;

      for (const user of users) {
        try {
          // Get user's recent activity
          const [newPrices, recentInquiries, savedSuppliers] = await Promise.all([
            Price.find({
              lastUpdated: { $gte: startDate },
              isActive: true,
            })
            .populate('materialId', 'name category')
            .populate('supplierId', 'profile.companyName')
            .limit(10)
            .sort({ lastUpdated: -1 }),

            Inquiry.find({
              userId: user._id,
              createdAt: { $gte: startDate },
            })
            .populate('materialId', 'name')
            .populate('supplierId', 'profile.companyName'),

            User.find({
              _id: { $in: user.preferences.savedSuppliers || [] },
              isActive: true,
            })
            .select('profile.companyName profile.rating'),
          ]);

          // Skip if no activity
          if (newPrices.length === 0 && recentInquiries.length === 0) {
            continue;
          }

          await this.sendWeeklyDigestEmail(user, {
            newPrices,
            recentInquiries,
            savedSuppliers,
            startDate,
          });

          sentCount++;
        } catch (userError) {
          logger.error(`Failed to send digest to user ${user._id}:`, userError);
        }
      }

      logger.info(`Weekly digest sent to ${sentCount} users`);

    } catch (error) {
      logger.error('Weekly digest failed:', error);
    }
  }

  // Send weekly digest email
  async sendWeeklyDigestEmail(user, data) {
    try {
      const priceUpdates = data.newPrices.map(price => 
        `• ${price.materialId.name}: ₹${price.price} (${price.supplierId.profile.companyName})`
      ).join('\n');

      const inquiries = data.recentInquiries.map(inquiry => 
        `• ${inquiry.materialId.name} - ${inquiry.status}`
      ).join('\n');

      const suppliers = data.savedSuppliers.map(supplier =>
        `• ${supplier.profile.companyName} (${supplier.profile.rating}⭐)`
      ).join('\n');

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .section { margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px; }
            .section h3 { margin-top: 0; color: #2563eb; }
            .button { display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px; }
            pre { white-space: pre-wrap; word-wrap: break-word; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Weekly Digest</h1>
            </div>
            <div class="content">
              <p>Hi ${user.username},</p>
              <p>Here's your weekly summary for the past 7 days:</p>

              ${data.newPrices.length > 0 ? `
                <div class="section">
                  <h3>💰 New Price Updates</h3>
                  <pre>${priceUpdates}</pre>
                </div>
              ` : ''}

              ${data.recentInquiries.length > 0 ? `
                <div class="section">
                  <h3>📋 Your Inquiries</h3>
                  <pre>${inquiries}</pre>
                </div>
              ` : ''}

              ${data.savedSuppliers.length > 0 ? `
                <div class="section">
                  <h3>⭐ Your Saved Suppliers</h3>
                  <pre>${suppliers}</pre>
                </div>
              ` : ''}

              <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
            </div>
          </div>
        </body>
        </html>
      `;

      await emailService.sendEmail(
        user.email,
        '📊 Your Weekly Construction Material Digest',
        emailHtml
      );

    } catch (error) {
      logger.error('Failed to send weekly digest email:', error);
    }
  }

  // Check inactive suppliers
  async checkInactiveSuppliers() {
    try {
      logger.info('Checking inactive suppliers...');

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days inactive

      const inactiveSuppliers = await User.find({
        role: 'supplier',
        isActive: true,
        lastLogin: { $lt: cutoffDate },
      })
      .select('username email profile.companyName lastLogin');

      if (inactiveSuppliers.length === 0) {
        logger.info('No inactive suppliers found');
        return;
      }

      // Send reminders to inactive suppliers
      for (const supplier of inactiveSuppliers) {
        await this.sendInactiveSupplierReminder(supplier);
      }

      logger.info(`Sent reminders to ${inactiveSuppliers.length} inactive suppliers`);

    } catch (error) {
      logger.error('Inactive supplier check failed:', error);
    }
  }

  // Send inactive supplier reminder
  async sendInactiveSupplierReminder(supplier) {
    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ef4444; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .button { display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏳ Account Inactivity Notice</h1>
            </div>
            <div class="content">
              <p>Hi ${supplier.profile.companyName || supplier.username},</p>
              <p>We noticed you haven't logged into your supplier account for over 30 days.</p>
              
              <p>Your last login was on: <strong>${new Date(supplier.lastLogin).toLocaleDateString()}</strong></p>

              <p>To continue receiving inquiries and updating prices, please log in to your account.</p>
              
              <a href="${process.env.FRONTEND_URL}/login" class="button">Login Now</a>
              
              <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
                If you no longer wish to use our platform, please contact support.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      await emailService.sendEmail(
        supplier.email,
        '⏳ Account Inactivity Notice',
        emailHtml
      );

      logger.info(`Inactive reminder sent to ${supplier.email}`);

    } catch (error) {
      logger.error('Failed to send inactive supplier reminder:', error);
    }
  }

  // Send price update notifications
  async sendPriceUpdateNotifications() {
    try {
      logger.info('Checking for price updates...');

      const lastHour = new Date();
      lastHour.setHours(lastHour.getHours() - 1);

      // Find price updates in the last hour
      const updatedPrices = await Price.find({
        lastUpdated: { $gte: lastHour },
        isActive: true,
      })
      .populate('materialId', 'name category unit')
      .populate('supplierId', 'profile.companyName');

      if (updatedPrices.length === 0) {
        return;
      }

      // Group by material
      const materialMap = {};
      for (const price of updatedPrices) {
        const materialId = price.materialId._id.toString();
        if (!materialMap[materialId]) {
          materialMap[materialId] = {
            material: price.materialId,
            prices: [],
          };
        }
        materialMap[materialId].prices.push(price);
      }

      // Find users interested in these materials
      const materialIds = Object.keys(materialMap);
      
      const interestedUsers = await User.find({
        'preferences.savedSuppliers': { $exists: true },
        isActive: true,
        'preferences.notifications': true,
      });

      if (interestedUsers.length === 0) {
        return;
      }

      let notificationsSent = 0;

      for (const user of interestedUsers) {
        // Find materials the user is interested in
        const userMaterials = [];
        for (const materialId of materialIds) {
          // Check if user has saved suppliers for this material
          const hasSavedSupplier = user.preferences.savedSuppliers.some(
            supplierId => materialMap[materialId].prices.some(
              price => price.supplierId._id.toString() === supplierId.toString()
            )
          );
          if (hasSavedSupplier) {
            userMaterials.push(materialMap[materialId]);
          }
        }

        if (userMaterials.length === 0) continue;

        await this.sendPriceUpdateEmail(user, userMaterials);
        notificationsSent++;
      }

      logger.info(`Sent ${notificationsSent} price update notifications`);

    } catch (error) {
      logger.error('Price update notification failed:', error);
    }
  }

  // Send price update email
  async sendPriceUpdateEmail(user, materialUpdates) {
    try {
      let updatesHtml = '';
      
      for (const update of materialUpdates) {
        updatesHtml += `
          <div style="margin: 10px 0; padding: 10px; background: #f3f4f6; border-radius: 5px;">
            <h4 style="margin: 0;">${update.material.name}</h4>
            ${update.prices.map(price => `
              <p style="margin: 5px 0;">
                ${price.supplierId.profile.companyName}: ₹${price.price} (${price.unit})
                <span style="color: #6b7280; font-size: 12px;">
                  Updated ${new Date(price.lastUpdated).toLocaleTimeString()}
                </span>
              </p>
            `).join('')}
          </div>
        `;
      }

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .button { display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔄 Price Updates</h1>
            </div>
            <div class="content">
              <p>Hi ${user.username},</p>
              <p>Prices have been updated for materials you're interested in:</p>
              
              ${updatesHtml}

              <a href="${process.env.FRONTEND_URL}/dashboard" class="button">View All Updates</a>
            </div>
          </div>
        </body>
        </html>
      `;

      await emailService.sendEmail(
        user.email,
        '🔄 Material Price Updates',
        emailHtml
      );

    } catch (error) {
      logger.error('Failed to send price update email:', error);
    }
  }

  // Manual trigger for price alerts
  async triggerPriceAlertCheck() {
    logger.info('Manually triggering price alert check...');
    await this.checkPriceAlerts();
    return { message: 'Price alert check triggered' };
  }

  // Manual trigger for weekly digest
  async triggerWeeklyDigest() {
    logger.info('Manually triggering weekly digest...');
    await this.sendWeeklyDigest();
    return { message: 'Weekly digest triggered' };
  }

  // Get notification job status
  async getStatus() {
    return {
      running: this.isRunning,
      jobs: [
        { name: 'priceAlerts', schedule: '0 */6 * * *' },
        { name: 'pendingInquiries', schedule: '0 */2 * * *' },
        { name: 'weeklyDigest', schedule: '0 8 * * 1' },
        { name: 'inactiveSuppliers', schedule: '0 3 * * *' },
        { name: 'priceUpdates', schedule: '0 */4 * * *' },
      ],
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = new NotificationJob();