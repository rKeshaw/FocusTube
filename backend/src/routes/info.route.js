// ============================================================
// FocusTube — Info Route
// GET /api/info/:videoId
// Returns video metadata for the download quality selector.
// Results are cached — repeated calls are fast.
// ============================================================

import { Router } from 'express';
import { getVideoInfo } from '../services/ytdlp.service.js';
import { validateVideoId } from '../middleware/validate.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get('/:videoId', validateVideoId, async (req, res, next) => {
  const { videoId } = req.params;
  logger.info('Video info requested', { videoId });

  try {
    const info = await getVideoInfo(videoId);
    res.json({ success: true, data: info });
  } catch (err) {
    logger.error('Failed to fetch video info', { videoId, error: err.message });
    next(err);
  }
});

export default router;
