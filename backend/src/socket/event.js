/**
 * Socket Events Constants
 * Defines all socket event names used in the application
 * Centralized event names for consistency
 */

module.exports = {
  // ============================================
  // CONNECTION EVENTS
  // ============================================
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  DISCONNECTING: 'disconnecting',
  ERROR: 'error',
  RECONNECT: 'reconnect',
  RECONNECT_ATTEMPT: 'reconnect_attempt',
  RECONNECTING: 'reconnecting',
  RECONNECT_ERROR: 'reconnect_error',
  RECONNECT_FAILED: 'reconnect_failed',

  // ============================================
  // AUTHENTICATION EVENTS
  // ============================================
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',
  AUTH_ERROR: 'auth_error',
  UNAUTHORIZED: 'unauthorized',

  // ============================================
  // INQUIRY EVENTS
  // ============================================
  INQUIRY_CREATE: 'inquiry:create',
  INQUIRY_CREATED: 'inquiry:created',
  INQUIRY_NEW: 'inquiry:new',
  INQUIRY_NEW_NOTIFICATION: 'inquiry:new_notification',
  INQUIRY_UPDATE: 'inquiry:update',
  INQUIRY_UPDATED: 'inquiry:updated',
  INQUIRY_RESPOND: 'inquiry:respond',
  INQUIRY_RESPONDED: 'inquiry:responded',
  INQUIRY_STATUS_CHANGE: 'inquiry:status_change',
  INQUIRY_ACCEPTED: 'inquiry:accepted',
  INQUIRY_REJECTED: 'inquiry:rejected',
  INQUIRY_CLOSED: 'inquiry:closed',

  // ============================================
  // PRICE EVENTS
  // ============================================
  PRICE_UPDATE: 'price:update',
  PRICE_UPDATED: 'price:updated',
  PRICE_ALERT: 'price:alert',
  PRICE_ALERT_TRIGGERED: 'price:alert_triggered',
  PRICE_COMPARE: 'price:compare',
  PRICE_COMPARE_RESULT: 'price:compare_result',

  // ============================================
  // SUPPLIER EVENTS
  // ============================================
  SUPPLIER_ONLINE: 'supplier:online',
  SUPPLIER_OFFLINE: 'supplier:offline',
  SUPPLIER_STATUS_CHANGE: 'supplier:status_change',
  SUPPLIER_VERIFIED: 'supplier:verified',
  SUPPLIER_RATING_UPDATE: 'supplier:rating_update',

  // ============================================
  // MATERIAL EVENTS
  // ============================================
  MATERIAL_ADDED: 'material:added',
  MATERIAL_UPDATED: 'material:updated',
  MATERIAL_DELETED: 'material:deleted',

  // ============================================
  // NOTIFICATION EVENTS
  // ============================================
  NOTIFICATION: 'notification',
  NOTIFICATION_SENT: 'notification:sent',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_DELETED: 'notification:deleted',

  // ============================================
  // FAVORITE EVENTS
  // ============================================
  FAVORITE_ADDED: 'favorite:added',
  FAVORITE_REMOVED: 'favorite:removed',

  // ============================================
  // CHAT/MESSAGING EVENTS
  // ============================================
  MESSAGE_SEND: 'message:send',
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_READ: 'message:read',
  MESSAGE_DELIVERED: 'message:delivered',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',

  // ============================================
  // USER EVENTS
  // ============================================
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  USER_ACTIVITY: 'user:activity',

  // ============================================
  // ROOM EVENTS
  // ============================================
  JOIN_ROOM: 'join:room',
  LEAVE_ROOM: 'leave:room',
  ROOM_JOINED: 'room:joined',
  ROOM_LEFT: 'room:left',

  // ============================================
  // ADMIN EVENTS
  // ============================================
  ADMIN_BROADCAST: 'admin:broadcast',
  ADMIN_ANNOUNCEMENT: 'admin:announcement',
  ADMIN_UPDATE: 'admin:update',

  // ============================================
  // SYSTEM EVENTS
  // ============================================
  SYSTEM_MAINTENANCE: 'system:maintenance',
  SYSTEM_UPDATE: 'system:update',
  SYSTEM_ERROR: 'system:error',
  PING: 'ping',
  PONG: 'pong',
};

/**
 * Room Names
 * Pre-defined room names for socket rooms
 */
const ROOMS = {
  USER: (userId) => `user_${userId}`,
  SUPPLIER: (supplierId) => `supplier_${supplierId}`,
  MATERIAL: (materialId) => `material_${materialId}`,
  INQUIRY: (inquiryId) => `inquiry_${inquiryId}`,
  ADMIN: 'admin_room',
  ALL_USERS: 'all_users',
  AUTHENTICATED: 'authenticated_users',
};

/**
 * Event Payload Types
 */
const EVENT_TYPES = {
  INQUIRY_CREATED: 'inquiry_created',
  INQUIRY_RESPONDED: 'inquiry_responded',
  INQUIRY_ACCEPTED: 'inquiry_accepted',
  INQUIRY_REJECTED: 'inquiry_rejected',
  INQUIRY_CLOSED: 'inquiry_closed',
  PRICE_UPDATED: 'price_updated',
  PRICE_ALERT: 'price_alert',
  NOTIFICATION_NEW: 'notification_new',
  NOTIFICATION_READ: 'notification_read',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
};

module.exports = {
  EVENTS: module.exports,
  ROOMS,
  EVENT_TYPES,
};