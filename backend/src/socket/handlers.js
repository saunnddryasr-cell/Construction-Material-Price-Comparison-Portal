const { EVENTS, ROOMS, EVENT_TYPES } = require('../socket/event');
const { verifyToken } = require('../config/jwt');
const User = require('../models/User.model');
const Inquiry = require('../models/Inquiry.model');
const Price = require('../models/Price.model');
const { logger } = require('../config/logger');

class SocketHandlers {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // userId -> socketId
    this.socketRooms = new Map(); // socketId -> Set of rooms
    this.userStatus = new Map(); // userId -> { status, lastSeen }
  }

  /**
   * Handle connection
   */
  handleConnection(socket) {
    logger.info(`Socket connected: ${socket.id}`);

    // Set up event handlers for this socket
    this.setupHandlers(socket);

    // Handle disconnection
    socket.on(EVENTS.DISCONNECT, () => {
      this.handleDisconnect(socket);
    });
  }

  /**
   * Setup all event handlers for a socket
   */
  setupHandlers(socket) {
    // Authentication
    socket.on(EVENTS.AUTHENTICATE, async (data) => {
      await this.handleAuthenticate(socket, data);
    });

    // Inquiry events
    socket.on(EVENTS.INQUIRY_CREATE, async (data) => {
      await this.handleInquiryCreate(socket, data);
    });

    socket.on(EVENTS.INQUIRY_RESPOND, async (data) => {
      await this.handleInquiryRespond(socket, data);
    });

    socket.on(EVENTS.INQUIRY_UPDATE, async (data) => {
      await this.handleInquiryUpdate(socket, data);
    });

    // Price events
    socket.on(EVENTS.PRICE_UPDATE, async (data) => {
      await this.handlePriceUpdate(socket, data);
    });

    socket.on(EVENTS.PRICE_COMPARE, async (data) => {
      await this.handlePriceCompare(socket, data);
    });

    // Notification events
    socket.on(EVENTS.NOTIFICATION_READ, async (data) => {
      await this.handleNotificationRead(socket, data);
    });

    // Message events
    socket.on(EVENTS.MESSAGE_SEND, async (data) => {
      await this.handleMessageSend(socket, data);
    });

    // Typing events
    socket.on(EVENTS.TYPING_START, (data) => {
      this.handleTypingStart(socket, data);
    });

    socket.on(EVENTS.TYPING_STOP, (data) => {
      this.handleTypingStop(socket, data);
    });

    // Room events
    socket.on(EVENTS.JOIN_ROOM, (data) => {
      this.handleJoinRoom(socket, data);
    });

    socket.on(EVENTS.LEAVE_ROOM, (data) => {
      this.handleLeaveRoom(socket, data);
    });

    // Ping/Pong
    socket.on(EVENTS.PING, () => {
      socket.emit(EVENTS.PONG, { timestamp: Date.now() });
    });

    // Admin events
    socket.on(EVENTS.ADMIN_BROADCAST, async (data) => {
      await this.handleAdminBroadcast(socket, data);
    });
  }

  /**
   * Handle authentication
   */
  async handleAuthenticate(socket, data) {
    try {
      const { token } = data;

      if (!token) {
        socket.emit(EVENTS.AUTH_ERROR, { message: 'Token is required' });
        return;
      }

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId);

      if (!user || !user.isActive) {
        socket.emit(EVENTS.AUTH_ERROR, { message: 'Invalid or inactive user' });
        return;
      }

      // Store user info in socket
      socket.userId = user._id;
      socket.userRole = user.role;
      socket.userEmail = user.email;
      socket.username = user.username;

      // Track connected user
      this.connectedUsers.set(user._id.toString(), socket.id);
      this.userStatus.set(user._id.toString(), {
        status: 'online',
        lastSeen: new Date(),
      });

      // Join user's personal room
      this.joinRoom(socket, ROOMS.USER(user._id.toString()));

      // Join role-based room
      if (user.role === 'supplier') {
        this.joinRoom(socket, ROOMS.SUPPLIER(user._id.toString()));
      }

      if (user.role === 'admin') {
        this.joinRoom(socket, ROOMS.ADMIN);
      }

      // Join authenticated users room
      this.joinRoom(socket, ROOMS.AUTHENTICATED);

      // Emit authenticated event
      socket.emit(EVENTS.AUTHENTICATED, {
        userId: user._id,
        username: user.username,
        role: user.role,
      });

      // Broadcast user online status
      this.io.emit(EVENTS.USER_ONLINE, {
        userId: user._id,
        username: user.username,
        role: user.role,
      });

      logger.info(`User authenticated: ${user.email} (${socket.id})`);

    } catch (error) {
      logger.error('Authentication error:', error);
      socket.emit(EVENTS.AUTH_ERROR, { message: 'Invalid token' });
    }
  }

  /**
   * Handle inquiry creation
   */
  async handleInquiryCreate(socket, data) {
    try {
      const { materialId, supplierId, quantity, message, unit, priority } = data;
      const userId = socket.userId;

      if (!userId) {
        socket.emit(EVENTS.AUTH_ERROR, { message: 'Not authenticated' });
        return;
      }

      // Create inquiry (this would be done by the controller)
      // For now, just emit to supplier
      const inquiryData = {
        id: `inq_${Date.now()}`,
        materialId,
        supplierId,
        userId,
        quantity,
        message,
        unit,
        priority,
        status: 'pending',
        createdAt: new Date(),
        user: {
          id: userId,
          username: socket.username,
        },
      };

      // Notify the supplier
      this.io.to(ROOMS.SUPPLIER(supplierId)).emit(EVENTS.INQUIRY_NEW, {
        ...inquiryData,
        type: EVENT_TYPES.INQUIRY_CREATED,
      });

      // Also send notification to supplier's user room
      this.io.to(ROOMS.USER(supplierId)).emit(EVENTS.INQUIRY_NEW_NOTIFICATION, {
        ...inquiryData,
        type: EVENT_TYPES.INQUIRY_CREATED,
      });

      // Confirm to the sender
      socket.emit(EVENTS.INQUIRY_CREATED, {
        ...inquiryData,
        type: EVENT_TYPES.INQUIRY_CREATED,
      });

      logger.info(`Inquiry created: ${inquiryData.id} from ${userId} to ${supplierId}`);

    } catch (error) {
      logger.error('Inquiry create error:', error);
      socket.emit(EVENTS.ERROR, { message: 'Failed to create inquiry' });
    }
  }

  /**
   * Handle inquiry response
   */
  async handleInquiryRespond(socket, data) {
    try {
      const { inquiryId, message, priceQuote, availableQuantity, estimatedDelivery } = data;
      const supplierId = socket.userId;

      if (!supplierId) {
        socket.emit(EVENTS.AUTH_ERROR, { message: 'Not authenticated' });
        return;
      }

      // In a real implementation, get inquiry from database
      // For now, emit to the user who created the inquiry
      const responseData = {
        inquiryId,
        supplierId,
        message,
        priceQuote,
        availableQuantity,
        estimatedDelivery,
        respondedAt: new Date(),
        supplier: {
          id: supplierId,
          username: socket.username,
        },
        type: EVENT_TYPES.INQUIRY_RESPONDED,
      };

      // Get the inquiry to find the user ID
      // This would be fetched from database
      // For now, we'll emit to the room

      // Notify the user who created the inquiry
      // this.io.to(ROOMS.USER(userId)).emit(EVENTS.INQUIRY_RESPONDED, responseData);

      // Also emit to the inquiry room if it exists
      // this.io.to(ROOMS.INQUIRY(inquiryId)).emit(EVENTS.INQUIRY_RESPONDED, responseData);

      socket.emit(EVENTS.INQUIRY_RESPONDED, {
        ...responseData,
        message: 'Response sent successfully',
      });

      logger.info(`Inquiry responded: ${inquiryId} by supplier ${supplierId}`);

    } catch (error) {
      logger.error('Inquiry respond error:', error);
      socket.emit(EVENTS.ERROR, { message: 'Failed to respond to inquiry' });
    }
  }

  /**
   * Handle inquiry update
   */
  async handleInquiryUpdate(socket, data) {
    try {
      const { inquiryId, status, note } = data;
      const userId = socket.userId;

      if (!userId) {
        socket.emit(EVENTS.AUTH_ERROR, { message: 'Not authenticated' });
        return;
      }

      const updateData = {
        inquiryId,
        status,
        note,
        updatedBy: userId,
        updatedAt: new Date(),
        type: `inquiry_${status}`,
      };

      // Emit to all participants
      // this.io.to(ROOMS.INQUIRY(inquiryId)).emit(EVENTS.INQUIRY_UPDATED, updateData);

      // Emit to the user who created the inquiry
      // this.io.to(ROOMS.USER(createdByUserId)).emit(EVENTS.INQUIRY_UPDATED, updateData);

      // Emit to the supplier
      // this.io.to(ROOMS.SUPPLIER(supplierId)).emit(EVENTS.INQUIRY_UPDATED, updateData);

      socket.emit(EVENTS.INQUIRY_UPDATED, {
        ...updateData,
        message: `Inquiry ${status} successfully`,
      });

      logger.info(`Inquiry updated: ${inquiryId} to ${status} by ${userId}`);

    } catch (error) {
      logger.error('Inquiry update error:', error);
      socket.emit(EVENTS.ERROR, { message: 'Failed to update inquiry' });
    }
  }

  /**
   * Handle price update
   */
  async handlePriceUpdate(socket, data) {
    try {
      const { materialId, price, unit, stockQuantity } = data;
      const supplierId = socket.userId;

      if (!supplierId) {
        socket.emit(EVENTS.AUTH_ERROR, { message: 'Not authenticated' });
        return;
      }

      const priceData = {
        materialId,
        supplierId,
        price,
        unit,
        stockQuantity,
        updatedAt: new Date(),
        supplier: {
          id: supplierId,
          username: socket.username,
        },
        type: EVENT_TYPES.PRICE_UPDATED,
      };

      // Broadcast price update to all users watching this material
      this.io.to(ROOMS.MATERIAL(materialId)).emit(EVENTS.PRICE_UPDATED, priceData);

      // Also emit to all authenticated users
      // this.io.to(ROOMS.AUTHENTICATED).emit(EVENTS.PRICE_UPDATED, priceData);

      socket.emit(EVENTS.PRICE_UPDATED, {
        ...priceData,
        message: 'Price updated successfully',
      });

      logger.info(`Price updated: ${materialId} by supplier ${supplierId} to ₹${price}`);

    } catch (error) {
      logger.error('Price update error:', error);
      socket.emit(EVENTS.ERROR, { message: 'Failed to update price' });
    }
  }

  /**
   * Handle price comparison request
   */
  async handlePriceCompare(socket, data) {
    try {
      const { materialId, location } = data;

      // In a real implementation, fetch from database
      // For now, emit back the result
      const result = {
        materialId,
        location,
        prices: [
          { supplier: 'Supplier A', price: 350, unit: 'bag' },
          { supplier: 'Supplier B', price: 375, unit: 'bag' },
          { supplier: 'Supplier C', price: 380, unit: 'bag' },
        ],
        timestamp: new Date(),
      };

      socket.emit(EVENTS.PRICE_COMPARE_RESULT, result);

      logger.info(`Price comparison requested: ${materialId} by ${socket.userId}`);

    } catch (error) {
      logger.error('Price compare error:', error);
      socket.emit(EVENTS.ERROR, { message: 'Failed to compare prices' });
    }
  }

  /**
   * Handle notification read
   */
  async handleNotificationRead(socket, data) {
    try {
      const { notificationId } = data;
      const userId = socket.userId;

      if (!userId) {
        socket.emit(EVENTS.AUTH_ERROR, { message: 'Not authenticated' });
        return;
      }

      // In a real implementation, update notification in database

      socket.emit(EVENTS.NOTIFICATION_READ, {
        notificationId,
        readAt: new Date(),
        type: EVENT_TYPES.NOTIFICATION_READ,
      });

      logger.info(`Notification read: ${notificationId} by ${userId}`);

    } catch (error) {
      logger.error('Notification read error:', error);
      socket.emit(EVENTS.ERROR, { message: 'Failed to mark notification as read' });
    }
  }

  /**
   * Handle message send
   */
  async handleMessageSend(socket, data) {
    try {
      const { to, message, type = 'text' } = data;
      const from = socket.userId;

      if (!from) {
        socket.emit(EVENTS.AUTH_ERROR, { message: 'Not authenticated' });
        return;
      }

      const messageData = {
        from,
        to,
        message,
        type,
        sentAt: new Date(),
        sender: {
          id: from,
          username: socket.username,
        },
      };

      // Send to recipient
      this.io.to(ROOMS.USER(to)).emit(EVENTS.MESSAGE_RECEIVED, messageData);

      // Confirm to sender
      socket.emit(EVENTS.MESSAGE_DELIVERED, {
        ...messageData,
        deliveredAt: new Date(),
      });

      logger.info(`Message sent from ${from} to ${to}`);

    } catch (error) {
      logger.error('Message send error:', error);
      socket.emit(EVENTS.ERROR, { message: 'Failed to send message' });
    }
  }

  /**
   * Handle typing start
   */
  handleTypingStart(socket, data) {
    const { to } = data;
    const from = socket.userId;

    if (!from) return;

    this.io.to(ROOMS.USER(to)).emit(EVENTS.TYPING_START, {
      from,
      username: socket.username,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle typing stop
   */
  handleTypingStop(socket, data) {
    const { to } = data;
    const from = socket.userId;

    if (!from) return;

    this.io.to(ROOMS.USER(to)).emit(EVENTS.TYPING_STOP, {
      from,
      username: socket.username,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle join room
   */
  handleJoinRoom(socket, data) {
    const { room, roomId } = data;

    if (room && roomId) {
      const roomName = ROOMS[room] ? ROOMS[room](roomId) : roomId;
      this.joinRoom(socket, roomName);
    } else if (roomId) {
      this.joinRoom(socket, roomId);
    }

    socket.emit(EVENTS.ROOM_JOINED, { room: roomId, joined: true });
  }

  /**
   * Handle leave room
   */
  handleLeaveRoom(socket, data) {
    const { room, roomId } = data;

    if (room && roomId) {
      const roomName = ROOMS[room] ? ROOMS[room](roomId) : roomId;
      this.leaveRoom(socket, roomName);
    } else if (roomId) {
      this.leaveRoom(socket, roomId);
    }

    socket.emit(EVENTS.ROOM_LEFT, { room: roomId, left: true });
  }

  /**
   * Handle admin broadcast
   */
  async handleAdminBroadcast(socket, data) {
    try {
      const { message, type = 'announcement', target = 'all' } = data;
      const userId = socket.userId;

      if (!userId) {
        socket.emit(EVENTS.AUTH_ERROR, { message: 'Not authenticated' });
        return;
      }

      const broadcastData = {
        message,
        type,
        sentBy: userId,
        sentAt: new Date(),
        target,
      };

      // Broadcast to all or specific target
      if (target === 'all') {
        this.io.emit(EVENTS.ADMIN_ANNOUNCEMENT, broadcastData);
      } else if (target === 'suppliers') {
        this.io.to(ROOMS.AUTHENTICATED).emit(EVENTS.ADMIN_ANNOUNCEMENT, broadcastData);
        // Also send to supplier room
        // this.io.to(ROOMS.SUPPLIER).emit(EVENTS.ADMIN_ANNOUNCEMENT, broadcastData);
      } else if (target === 'users') {
        this.io.to(ROOMS.AUTHENTICATED).emit(EVENTS.ADMIN_ANNOUNCEMENT, broadcastData);
      }

      socket.emit(EVENTS.ADMIN_ANNOUNCEMENT, {
        ...broadcastData,
        delivered: true,
      });

      logger.info(`Admin broadcast sent by ${userId}: ${message}`);

    } catch (error) {
      logger.error('Admin broadcast error:', error);
      socket.emit(EVENTS.ERROR, { message: 'Failed to send broadcast' });
    }
  }

  /**
   * Handle disconnect
   */
  handleDisconnect(socket) {
    const userId = socket.userId;

    if (userId) {
      // Remove from connected users
      this.connectedUsers.delete(userId.toString());
      
      // Update status
      this.userStatus.set(userId.toString(), {
        status: 'offline',
        lastSeen: new Date(),
      });

      // Broadcast user offline status
      this.io.emit(EVENTS.USER_OFFLINE, {
        userId,
        username: socket.username,
        lastSeen: new Date(),
      });

      logger.info(`User disconnected: ${userId} (${socket.id})`);
    } else {
      logger.info(`Socket disconnected: ${socket.id}`);
    }

    // Clean up socket rooms
    this.socketRooms.delete(socket.id);
  }

  /**
   * Join a room
   */
  joinRoom(socket, roomName) {
    socket.join(roomName);
    
    // Track rooms for this socket
    if (!this.socketRooms.has(socket.id)) {
      this.socketRooms.set(socket.id, new Set());
    }
    this.socketRooms.get(socket.id).add(roomName);

    logger.debug(`Socket ${socket.id} joined room: ${roomName}`);
  }

  /**
   * Leave a room
   */
  leaveRoom(socket, roomName) {
    socket.leave(roomName);
    
    // Remove from tracked rooms
    if (this.socketRooms.has(socket.id)) {
      this.socketRooms.get(socket.id).delete(roomName);
    }

    logger.debug(`Socket ${socket.id} left room: ${roomName}`);
  }

  /**
   * Get user status
   */
  getUserStatus(userId) {
    return this.userStatus.get(userId.toString()) || {
      status: 'offline',
      lastSeen: null,
    };
  }

  /**
   * Get connected users
   */
  getConnectedUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  /**
   * Get socket for user
   */
  getUserSocket(userId) {
    const socketId = this.connectedUsers.get(userId.toString());
    return socketId ? this.io.sockets.sockets.get(socketId) : null;
  }

  /**
   * Send to user
   */
  sendToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId.toString());
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  /**
   * Send to supplier
   */
  sendToSupplier(supplierId, event, data) {
    this.io.to(ROOMS.SUPPLIER(supplierId)).emit(event, data);
  }

  /**
   * Broadcast to all
   */
  broadcastAll(event, data) {
    this.io.emit(event, data);
  }

  /**
   * Broadcast to authenticated users
   */
  broadcastAuthenticated(event, data) {
    this.io.to(ROOMS.AUTHENTICATED).emit(event, data);
  }
}

module.exports = SocketHandlers;