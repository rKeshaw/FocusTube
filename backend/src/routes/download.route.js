// ============================================================
// FocusTube — Download Route
// POST /api/download
// Streams the video/audio directly to the client.
// Nothing is written to disk on the server.
// ============================================================

import { Router } from 'express';
import { downloadStream, getVideoInfo } from '../services/ytdlp.service.js';
import { convertToMp3 } from '../services/ffmpeg.service.js';
import { validateDownload } from '../middleware/validate.js';
import { downloadLimiter } from '../middleware/rateLimit.js';
import { pipeStreamToResponse, sanitizeFilename } from '../utils/streamHelper.js';
import { logger } from '../utils/logger.js';

const router = Router();

const MIME_TYPES = {
  mp4: 'video/mp4',
  mp3: 'audio/mpeg',
  webm: 'video/webm',
};

router.post('/', downloadLimiter, validateDownload, async (req, res, next) => {
  const {
    videoId,
    format = 'mp4',
    quality = 'best',
    audioOnly = false,
    iosMode = false,   // iOS Safari: return info for native player instead of stream
  } = req.body;

  logger.info('Download requested', { videoId, format, quality, audioOnly });

  try {
    // Fetch title for the filename
    let title = videoId;
    try {
      const info = await getVideoInfo(videoId);
      title = info.title;
    } catch {
      // Non-fatal — use videoId as fallback filename
      logger.warn('Could not fetch title for filename', { videoId });
    }

    const filename = `${sanitizeFilename(title)}.${format}`;

    // iOS Safari doesn't handle streamed downloads well.
    // Return a JSON response with the stream URL so the frontend
    // can open it in the native player / share sheet.
    if (iosMode) {
      return res.json({
        success: true,
        iosStreamUrl: `/api/download/stream/${videoId}?format=${format}&quality=${quality}`,
        filename,
      });
    }

    const rawStream = downloadStream(videoId, format, quality, audioOnly);

    // If requesting MP3, pipe through ffmpeg for reliable conversion
    const outputStream = format === 'mp3'
      ? convertToMp3(rawStream)
      : rawStream;

    pipeStreamToResponse(outputStream, res, filename, MIME_TYPES[format] || 'application/octet-stream');

  } catch (err) {
    next(err);
  }
});

// GET endpoint for iOS direct stream URL (opened in native player)
router.get('/stream/:videoId', async (req, res, next) => {
  const { videoId } = req.params;
  const { format = 'mp4', quality = 'best' } = req.query;

  // Validate manually (param not in body here)
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'Invalid videoId' });
  }

  logger.info('iOS stream requested', { videoId, format, quality });

  try {
    let title = videoId;
    try {
      const info = await getVideoInfo(videoId);
      title = info.title;
    } catch { /* non-fatal */ }

    const filename = `${sanitizeFilename(title)}.${format}`;
    const stream = downloadStream(videoId, format, quality, false);

    pipeStreamToResponse(stream, res, filename, MIME_TYPES[format] || 'application/octet-stream');
  } catch (err) {
    next(err);
  }
});

export default router;
