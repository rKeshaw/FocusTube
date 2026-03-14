// ============================================================
// FocusTube — Global Error Handler
// Catches all unhandled errors thrown in routes/services.
// Centralized so error response shape is always consistent.
// ============================================================

import { logger } from '../utils/logger.js';
import { CONFIG } from '../config/constants.js';

// Must have 4 params for Express to treat it as error middleware
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  logger.error('Unhandled error', {
    status,
    message,
    path: req.path,
    method: req.method,
    // Only log stack in development
    ...(CONFIG.NODE_ENV === 'development' && { stack: err.stack }),
  });

  res.status(status).json({
    error: message,
    // Expose detail only in development
    ...(CONFIG.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// Catch-all for routes that don't exist
export const notFound = (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
  });
};
