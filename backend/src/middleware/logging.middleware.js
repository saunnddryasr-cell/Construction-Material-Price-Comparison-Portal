const { logger } = require('../config/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    
    logger.log(logLevel, 'HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      userId: req.user?._id,
    });
  });
  
  next();
};

const responseLogger = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Response Data', {
        url: req.url,
        status: res.statusCode,
        data: typeof data === 'string' ? data : JSON.stringify(data),
      });
    }
    return originalSend.call(this, data);
  };
  
  next();
};

module.exports = {
  requestLogger,
  responseLogger,
};