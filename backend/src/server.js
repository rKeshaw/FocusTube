// ============================================================
// FocusTube — Server Entry Point
// Bootstraps Express, applies all middleware, mounts routes.
// This file should stay thin — logic lives in services/routes.
// ============================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { CONFIG } from './config/constants.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import routes from './routes/index.js';
import { logger } from './utils/logger.js';

const app = express();

// ── Security ─────────────────────────────────────────────────
app.use(helmet({
  // Allow video streaming responses
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (CONFIG.CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Parsing & Compression ─────────────────────────────────────
app.use(express.json({ limit: '10kb' }));   // Small limit — no file uploads here
app.use(compression());

// ── Rate Limiting ─────────────────────────────────────────────
app.use('/api', apiLimiter);

// ── Request Logging ───────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Date.now() - start,
      ip: req.ip,
    });
  });
  next();
});

// ── Routes ────────────────────────────────────────────────────
app.use('/api', routes);

// Root ping — useful for uptime monitors
app.get('/', (req, res) => {
  res.json({
    name: 'FocusTube API',
    version: '1.0.0',
    status: 'running',
    docs: '/api/health',
  });
});

// ── Error Handling ────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────
app.listen(CONFIG.PORT, () => {
  logger.info('FocusTube backend started', {
    port: CONFIG.PORT,
    env: CONFIG.NODE_ENV,
    cors: CONFIG.CORS_ORIGINS,
  });
});

export default app;
