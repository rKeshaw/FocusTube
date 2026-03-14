// ============================================================
// FocusTube — Health Route
// GET /api/health
// Frontend pings this to know if the backend + tools are live.
// Returns tool versions and availability flags.
// ============================================================

import { Router } from 'express';
import { getYtDlpVersion } from '../services/ytdlp.service.js';
import { getFfmpegVersion } from '../services/ffmpeg.service.js';
import { cache } from '../services/cache.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get('/', async (req, res) => {
  logger.debug('Health check requested');

  // Run version checks in parallel
  const [ytdlpVersion, ffmpegVersion] = await Promise.all([
    getYtDlpVersion(),
    getFfmpegVersion(),
  ]);

  const healthy = !!(ytdlpVersion && ffmpegVersion);

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      ytdlp: {
        available: !!ytdlpVersion,
        version: ytdlpVersion || 'not found',
      },
      ffmpeg: {
        available: !!ffmpegVersion,
        version: ffmpegVersion || 'not found',
      },
    },
    cache: {
      entries: cache.size,
    },
  });
});

export default router;
