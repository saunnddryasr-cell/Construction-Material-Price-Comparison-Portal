const Inquiry = require('../models/Inquiry.model');
const User = require('../models/User.model');
const Material = require('../models/Material.model');
const { logger } = require('../config/logger');
const { ApiResponse } = require('../utils/apiResponse');
const { ValidationError, NotFoundError } = require('../utils/errorCodes');
const emailService = require('../services/email.service');

class InquiryController {
  // Create inquiry
  async createInquiry(req, res, next) {
    try {
      const { materialId, supplierId, quantity, message, unit, priority } = req.body;
      const userId = req.user._id;

      // Validate
      const material = await Material.findById(materialId);
      if (!material) {
        throw new NotFoundError('Material not found');
      }

      const supplier = await User.findOne({
        _id: supplierId,
        role: 'supplier',
        isActive: true,
      });
      if (!supplier) {
        throw new NotFoundError('Supplier not found');
      }

      const inquiry = new Inquiry({
        materialId,
        supplierId,
        userId,
        quantity,
        message,
        unit: unit || material.unit,
        priority: priority || 'medium',
        status: 'pending',
      });

      inquiry.timeline.push({
        status: 'pending',
        note: 'Inquiry created',
      });

      await inquiry.save();

      // Send email notification to supplier
      try {
        await emailService.sendInquiryNotification(supplier.email, {
          id: inquiry._id,
          materialName: material.name,
          quantity,
          message,
        });
      } catch (emailError) {
        logger.error('Email notification failed:', emailError);
      }

      logger.info(`Inquiry created: ${inquiry._id} by user ${userId}`);

      return ApiResponse.success(res, {
        inquiry,
        message: 'Inquiry sent successfully',
      }, 201);
    } catch (error) {
      next(error);
    }
  }

  // Get inquiry by ID
  async getInquiryById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const userRole = req.user.role;

      const inquiry = await Inquiry.findById(id)
        .populate('materialId', 'name category unit')
        .populate('supplierId', 'username email profile.companyName profile.phone')
        .populate('userId', 'username email profile.companyName profile.phone');

      if (!inquiry) {
        throw new NotFoundError('Inquiry not found');
      }

      // Check access
      if (userRole !== 'admin' && 
          inquiry.userId._id.toString() !== userId.toString() && 
          inquiry.supplierId._id.toString() !== userId.toString()) {
        throw new ValidationError('You do not have access to this inquiry');
      }

      return ApiResponse.success(res, { inquiry });
    } catch (error) {
      next(error);
    }
  }

  // Get user inquiries
  async getUserInquiries(req, res, next) {
    try {
      const userId = req.user._id;
      const { status, page = 1, limit = 20 } = req.query;

      const match = { userId };
      if (status) {
        match.status = status;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const inquiries = await Inquiry.find(match)
        .populate('materialId', 'name category unit')
        .populate('supplierId', 'username profile.companyName profile.rating')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await Inquiry.countDocuments(match);

      return ApiResponse.success(res, {
        inquiries,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get supplier inquiries
  async getSupplierInquiries(req, res, next) {
    try {
      const supplierId = req.user._id;
      const { status, page = 1, limit = 20 } = req.query;

      const match = { supplierId };
      if (status) {
        match.status = status;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const inquiries = await Inquiry.find(match)
        .populate('materialId', 'name category unit')
        .populate('userId', 'username profile.companyName profile.phone')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await Inquiry.countDocuments(match);

      return ApiResponse.success(res, {
        inquiries,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Respond to inquiry
  async respondToInquiry(req, res, next) {
    try {
      const { id } = req.params;
      const { message } = req.body;
      const userId = req.user._id;

      if (!message) {
        throw new ValidationError('Message is required');
      }

      const inquiry = await Inquiry.findById(id);
      if (!inquiry) {
        throw new NotFoundError('Inquiry not found');
      }

      // Check if user is the supplier
      if (inquiry.supplierId.toString() !== userId.toString()) {
        throw new ValidationError('Only the supplier can respond to this inquiry');
      }

      await inquiry.addResponse(message, userId);

      // Send email notification to user
      try {
        const user = await User.findById(inquiry.userId);
        const material = await Material.findById(inquiry.materialId);
        if (user) {
          await emailService.sendEmail(user.email, 'Inquiry Response Received', `
            <h1>Inquiry Response</h1>
            <p>Your inquiry for ${material.name} has received a response.</p>
            <p>Response: ${message}</p>
            <a href="${process.env.FRONTEND_URL}/inquiries/${inquiry._id}">View Inquiry</a>
          `);
        }
      } catch (emailError) {
        logger.error('Email notification failed:', emailError);
      }

      logger.info(`Inquiry ${id} responded by supplier ${userId}`);

      return ApiResponse.success(res, {
        inquiry,
        message: 'Response sent successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Update inquiry status
  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, note } = req.body;
      const userId = req.user._id;
      const userRole = req.user.role;

      const inquiry = await Inquiry.findById(id);
      if (!inquiry) {
        throw new NotFoundError('Inquiry not found');
      }

      // Check access
      if (userRole !== 'admin' && 
          inquiry.userId.toString() !== userId.toString() && 
          inquiry.supplierId.toString() !== userId.toString()) {
        throw new ValidationError('You do not have permission to update this inquiry');
      }

      await inquiry.updateStatus(status, note);

      logger.info(`Inquiry ${id} status updated to ${status} by ${userId}`);

      return ApiResponse.success(res, {
        inquiry,
        message: 'Inquiry status updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete inquiry
  async deleteInquiry(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const inquiry = await Inquiry.findById(id);
      if (!inquiry) {
        throw new NotFoundError('Inquiry not found');
      }

      // Check if user owns the inquiry
      if (inquiry.userId.toString() !== userId.toString()) {
        throw new ValidationError('You can only delete your own inquiries');
      }

      if (inquiry.status !== 'pending') {
        throw new ValidationError('Only pending inquiries can be deleted');
      }

      await inquiry.remove();

      logger.info(`Inquiry ${id} deleted by user ${userId}`);

      return ApiResponse.success(res, {
        message: 'Inquiry deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Get inquiry count for supplier
  async getInquiryCount(req, res, next) {
    try {
      const supplierId = req.user._id;

      const total = await Inquiry.countDocuments({ supplierId });
      const pending = await Inquiry.countDocuments({ supplierId, status: 'pending' });
      const responded = await Inquiry.countDocuments({ supplierId, status: 'responded' });
      const closed = await Inquiry.countDocuments({ supplierId, status: 'closed' });

      return ApiResponse.success(res, {
        total,
        pending,
        responded,
        closed,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InquiryController();