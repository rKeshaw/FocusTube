// ============================================================
// FocusTube — Clip Route
// POST /api/clip
// Download only a specific time range of a video.
// Great for saving a lecture segment, a music section, etc.
// ============================================================

import { Router } from 'express';
import { clipStream, getVideoInfo } from '../services/ytdlp.service.js';
import { trimStream } from '../services/ffmpeg.service.js';
import { validateClip } from '../middleware/validate.js';
import { downloadLimiter } from '../middleware/rateLimit.js';
import { pipeStreamToResponse, sanitizeFilename, formatDuration } from '../utils/streamHelper.js';
import { logger } from '../utils/logger.js';

const router = Router();

const MIME_TYPES = {
  mp4: 'video/mp4',
  mp3: 'audio/mpeg',
  webm: 'video/webm',
};

router.post('/', downloadLimiter, validateClip, async (req, res, next) => {
  const {
    videoId,
    startTime,
    endTime,
    format = 'mp4',
  } = req.body;

  const start = Number(startTime);
  const end = Number(endTime);

  logger.info('Clip requested', { videoId, start, end, format });

  try {
    let title = videoId;
    try {
      const info = await getVideoInfo(videoId);
      title = info.title;
    } catch {
      logger.warn('Could not fetch title for clip filename', { videoId });
    }

    // Include time range in filename so user knows what they downloaded
    const timeTag = `${formatDuration(start)}-${formatDuration(end)}`.replace(/:/g, 'm').replace(/-/g, '_');
    const filename = `${sanitizeFilename(title)}_clip_${timeTag}.${format}`;

    const raw = clipStream(videoId, start, end, format);

    // Use ffmpeg to precisely trim to the requested window
    const outputStream = trimStream(raw, start, end, format);

    pipeStreamToResponse(outputStream, res, filename, MIME_TYPES[format] || 'application/octet-stream');

  } catch (err) {
    next(err);
  }
});

export default router;
