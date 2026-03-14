// ============================================================
// FocusTube — Rate Limiting Middleware
// Two tiers: general API limit + stricter download limit.
// Uses express-rate-limit. Swap store to Redis for multi-instance.
// ============================================================

import rateLimit from 'express-rate-limit';
import { CONFIG } from '../config/constants.js';

const { WINDOW_MS, MAX_REQUESTS, DOWNLOAD_MAX } = CONFIG.RATE_LIMIT;

// General API rate limiter — all routes
export const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  standardHeaders: true,   // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    detail: `Max ${MAX_REQUESTS} requests per hour`,
    retryAfter: Math.ceil(WINDOW_MS / 1000 / 60) + ' minutes',
  },
});

// Stricter limiter for download endpoints (resource-intensive)
export const downloadLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: DOWNLOAD_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Download limit reached',
    detail: `Max ${DOWNLOAD_MAX} downloads per hour`,
    retryAfter: Math.ceil(WINDOW_MS / 1000 / 60) + ' minutes',
  },
});
