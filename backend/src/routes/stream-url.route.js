// ============================================================
// FocusTube — Stream URL Route
// GET /api/stream-url/:videoId
// Returns direct stream URLs extracted by yt-dlp.
// Nothing is downloaded — URLs are handed to the frontend
// so Plyr can play them directly with no YouTube UI.
// ============================================================

import { Router } from 'express';
import { getStreamUrls } from '../services/ytdlp.service.js';
import { validateVideoId } from '../middleware/validate.js';
import { apiLimiter } from '../middleware/rateLimit.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get('/:videoId', apiLimiter, validateVideoId, async (req, res, next) => {
  const { videoId } = req.params;
  const { quality = 'best' } = req.query;

  logger.info('Stream URL requested', { videoId, quality });

  try {
    const result = await getStreamUrls(videoId, quality);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('Failed to get stream URLs', { videoId, error: err.message });
    next(err);
  }
});

export default router;