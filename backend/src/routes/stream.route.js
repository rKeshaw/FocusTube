// ============================================================
// FocusTube — Stream Route
// GET /api/stream/:videoId?quality=<quality>
//
// YouTube serves muxed (video+audio combined) streams only up to 720p.
// For 1080p and "best", video and audio are separate DASH streams that
// must be merged. We use ffmpeg to merge them on the fly and pipe the
// result directly to the browser as fragmented mp4.
//
// For ≤720p: yt-dlp --get-url returns one muxed URL → proxy directly.
// For 1080p/best: yt-dlp --get-url returns two URLs → ffmpeg merges → pipe.
// ============================================================

import { Router } from 'express';
import { spawn } from 'child_process';
import { validateVideoId } from '../middleware/validate.js';
import { apiLimiter } from '../middleware/rateLimit.js';
import { CONFIG } from '../config/constants.js';
import { logger } from '../utils/logger.js';

const router = Router();
const YTDLP  = CONFIG.YTDLP_PATH;
const FFMPEG = CONFIG.FFMPEG_PATH;

// ── Format selectors ──────────────────────────────────────────

const resolveFormat = (quality) => {
  switch (quality) {
    case '360p':
      return { selector: 'best[height<=360][ext=mp4]/best[height<=360]', needsMerge: false };
    case '480p':
      return { selector: 'best[height<=480][ext=mp4]/best[height<=480]', needsMerge: false };
    case '720p':
      return { selector: 'best[height<=720][ext=mp4]/best[height<=720]', needsMerge: false };
    case '1080p':
      return {
        selector: 'bestvideo[height<=1080][ext=mp4][vcodec!*=av01]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio',
        needsMerge: true,
      };
    case 'best':
    default:
      return {
        selector: 'best[ext=mp4][height<=720]/bestvideo[ext=mp4][vcodec!*=av01]+bestaudio[ext=m4a]/bestvideo+bestaudio',
        needsMerge: 'auto',
      };
  }
};

// ── URL resolution via yt-dlp ─────────────────────────────────

const getStreamUrls = (videoId, formatSelector) => {
  return new Promise((resolve, reject) => {
    const proc = spawn(YTDLP, [
      '--no-playlist',
      '-f', formatSelector,
      '--get-url',
      `https://www.youtube.com/watch?v=${videoId}`,
    ]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr || `yt-dlp exited ${code}`));
      const urls = stdout.trim().split('\n').map(u => u.trim()).filter(Boolean);
      if (!urls.length) return reject(new Error('yt-dlp returned no URLs'));
      resolve(urls);
    });

    proc.on('error', reject);
  });
};

// ── Muxed stream proxy (single URL, range-request capable) ────

const proxyMuxed = async (streamUrl, req, res, videoId) => {
  const headers = { 'User-Agent': 'Mozilla/5.0' };
  if (req.headers['range']) headers['Range'] = req.headers['range'];

  let cdnRes;
  try {
    cdnRes = await fetch(streamUrl, { headers });
  } catch (err) {
    throw new Error(`CDN fetch failed: ${err.message}`);
  }

  if (!cdnRes.ok && cdnRes.status !== 206) {
    throw new Error(`CDN returned ${cdnRes.status}`);
  }

  const forward = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
  res.status(cdnRes.status);
  for (const h of forward) {
    const v = cdnRes.headers.get(h);
    if (v) res.setHeader(h, v);
  }
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('X-Accel-Buffering', 'no');

  logger.info('Proxying muxed stream', { videoId, status: cdnRes.status });

  const reader = cdnRes.body.getReader();
  req.on('close', () => reader.cancel());

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) { res.end(); break; }
      const ok = res.write(value);
      if (!ok) await new Promise(resolve => res.once('drain', resolve));
    }
  } catch (err) {
    if (err.code !== 'ERR_STREAM_DESTROYED') {
      logger.error('Muxed proxy pipe error', { videoId, error: err.message });
    }
    reader.cancel();
  }
};

// ── Merged stream via ffmpeg (two URLs → fragmented mp4) ──────

const proxyMerged = (videoUrl, audioUrl, req, res, videoId) => {
  const args = [
    '-hide_banner',
    '-loglevel', 'error',
    '-i', videoUrl,
    '-i', audioUrl,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
    '-f', 'mp4',
    'pipe:1',
  ];

  const proc = spawn(FFMPEG, args);

  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Accept-Ranges', 'none');
  res.status(200);

  logger.info('Proxying merged stream via ffmpeg', { videoId });

  proc.stderr.on('data', (d) => {
    logger.debug('ffmpeg merge stderr', { data: d.toString().trim() });
  });

  proc.on('error', (err) => {
    logger.error('ffmpeg merge spawn error', { videoId, error: err.message });
    if (!res.headersSent) res.status(500).end();
  });

  proc.stdout.pipe(res);
  req.on('close', () => proc.kill('SIGKILL'));
};

// ── Route handler ─────────────────────────────────────────────

router.get('/:videoId', apiLimiter, validateVideoId, async (req, res, next) => {
  const { videoId } = req.params;
  const quality = req.query.quality || 'best';

  logger.info('Stream requested', { videoId, quality });

  const { selector, needsMerge } = resolveFormat(quality);

  let urls;
  try {
    urls = await getStreamUrls(videoId, selector);
  } catch (err) {
    logger.error('Failed to resolve stream URLs', { videoId, error: err.message });
    return next(err);
  }

  const requiresMerge = needsMerge === true || (needsMerge === 'auto' && urls.length === 2);

  try {
    if (requiresMerge && urls.length >= 2) {
      proxyMerged(urls[0], urls[1], req, res, videoId);
    } else {
      await proxyMuxed(urls[0], req, res, videoId);
    }
  } catch (err) {
    logger.error('Stream proxy failed', { videoId, error: err.message });
    if (!res.headersSent) next(err);
  }
});

export default router;