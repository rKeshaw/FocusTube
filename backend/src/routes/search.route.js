// ============================================================
// FocusTube — Search Route
// GET /api/search?q=<query>&limit=<n>
// Delegates to yt-dlp's YouTube search extractor.
// No third-party API dependency. No Invidious. No API keys.
// ============================================================

import { Router } from 'express';
import { searchVideos } from '../services/ytdlp.service.js';
import { apiLimiter } from '../middleware/rateLimit.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Maximum results the client is allowed to request.
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

router.get('/', apiLimiter, async (req, res, next) => {
  const q = req.query.q?.trim();

  if (!q) {
    return res.status(400).json({
      error: 'Missing query parameter',
      detail: 'Provide ?q=<search term>',
    });
  }

  const limit = Math.min(
    parseInt(req.query.limit) || DEFAULT_LIMIT,
    MAX_LIMIT
  );

  logger.info('Search requested', { q, limit });

  try {
    const results = await searchVideos(q, limit);
    res.json({ success: true, data: results, count: results.length });
  } catch (err) {
    logger.error('Search failed', { q, error: err.message });
    next(err);
  }
});

export default router;