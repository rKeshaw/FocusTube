// ============================================================
// FocusTube — Stream Helper
// All stream piping, timeout handling, and cleanup logic.
// ============================================================

import { logger } from './logger.js';
import { CONFIG } from '../config/constants.js';

/**
 * Pipes a readable stream to an Express response with:
 * - Timeout enforcement
 * - Error handling
 * - Cleanup on client disconnect
 */
export const pipeStreamToResponse = (stream, res, filename, mimeType) => {
  res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(filename)}"`);
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering for streams

  let finished = false;

  const timeout = setTimeout(() => {
    if (!finished) {
      logger.warn('Stream timeout — killing stream', { filename });
      stream.destroy(new Error('Stream timeout'));
      if (!res.headersSent) res.status(504).json({ error: 'Download timed out' });
    }
  }, CONFIG.DOWNLOAD.TIMEOUT_MS);

  // Client disconnected — kill the stream
  res.on('close', () => {
    if (!finished) {
      logger.debug('Client disconnected — destroying stream');
      stream.destroy();
    }
    clearTimeout(timeout);
  });

  stream.on('error', (err) => {
    finished = true;
    clearTimeout(timeout);
    logger.error('Stream error', { error: err.message, filename });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Stream failed', detail: err.message });
    }
  });

  stream.on('end', () => {
    finished = true;
    clearTimeout(timeout);
    logger.debug('Stream completed', { filename });
  });

  stream.pipe(res);
};

/**
 * Sanitize a filename to be safe for Content-Disposition headers.
 */
export const sanitizeFilename = (name) =>
  name
    .replace(/[^\w\s.\-()]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 200)
    .trim() || 'focustube_download';

/**
 * Format a duration in seconds to mm:ss or hh:mm:ss string.
 */
export const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};
