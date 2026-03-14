// ============================================================
// FocusTube — Validation Middleware
// All input validation in one place.
// videoId regex prevents shell injection into yt-dlp.
// ============================================================

import { CONFIG } from '../config/constants.js';

// YouTube video IDs are exactly 11 chars: alphanumeric, hyphen, underscore
const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Validates :videoId route parameter.
 * Use on any route that accepts a videoId.
 */
export const validateVideoId = (req, res, next) => {
  const { videoId } = req.params;
  if (!videoId || !VIDEO_ID_REGEX.test(videoId)) {
    return res.status(400).json({
      error: 'Invalid videoId',
      detail: 'Must be an 11-character YouTube video ID',
    });
  }
  next();
};

/**
 * Validates POST /api/download body.
 */
export const validateDownload = (req, res, next) => {
  const { videoId, format, quality } = req.body;

  if (!videoId || !VIDEO_ID_REGEX.test(videoId)) {
    return res.status(400).json({ error: 'Invalid videoId' });
  }

  if (format && !CONFIG.DOWNLOAD.ALLOWED_FORMATS.includes(format)) {
    return res.status(400).json({
      error: 'Invalid format',
      allowed: CONFIG.DOWNLOAD.ALLOWED_FORMATS,
    });
  }

  if (quality && !CONFIG.DOWNLOAD.ALLOWED_QUALITIES.includes(quality)) {
    return res.status(400).json({
      error: 'Invalid quality',
      allowed: CONFIG.DOWNLOAD.ALLOWED_QUALITIES,
    });
  }

  next();
};

/**
 * Validates POST /api/clip body.
 */
export const validateClip = (req, res, next) => {
  const { videoId, startTime, endTime, format } = req.body;

  if (!videoId || !VIDEO_ID_REGEX.test(videoId)) {
    return res.status(400).json({ error: 'Invalid videoId' });
  }

  const start = Number(startTime);
  const end = Number(endTime);

  if (isNaN(start) || isNaN(end) || start < 0 || end <= start) {
    return res.status(400).json({
      error: 'Invalid time range',
      detail: 'startTime and endTime must be positive numbers with end > start',
    });
  }

  const duration = end - start;
  if (duration > CONFIG.DOWNLOAD.MAX_CLIP_DURATION_SECONDS) {
    return res.status(400).json({
      error: 'Clip too long',
      detail: `Maximum clip duration is ${CONFIG.DOWNLOAD.MAX_CLIP_DURATION_SECONDS} seconds`,
    });
  }

  if (format && !CONFIG.DOWNLOAD.ALLOWED_FORMATS.includes(format)) {
    return res.status(400).json({
      error: 'Invalid format',
      allowed: CONFIG.DOWNLOAD.ALLOWED_FORMATS,
    });
  }

  next();
};
