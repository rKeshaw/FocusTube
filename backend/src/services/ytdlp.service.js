// ============================================================
// FocusTube — yt-dlp Service
// THE ONLY FILE that directly invokes yt-dlp.
// Routes and other services call this — they never touch yt-dlp.
// Swap yt-dlp for another tool? Change ONLY this file.
// ============================================================

import { spawn } from 'child_process';
import { Readable } from 'stream';
import { CONFIG } from '../config/constants.js';
import { cache } from './cache.service.js';
import { logger } from '../utils/logger.js';

const YTDLP = CONFIG.YTDLP_PATH;

// ── Helpers ──────────────────────────────────────────────────

/**
 * Run yt-dlp with given args, collect stdout as string.
 * Rejects with stderr on non-zero exit.
 */
const runYtDlp = (args) => {
  return new Promise((resolve, reject) => {
    logger.debug('yt-dlp exec', { args });
    const proc = spawn(YTDLP, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        logger.error('yt-dlp exited with error', { code, stderr });
        reject(new Error(stderr || `yt-dlp exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
    });
  });
};

/**
 * Map user-facing quality string to yt-dlp format selector.
 */
const buildFormatSelector = (format, quality, audioOnly) => {
  if (audioOnly || format === 'mp3') {
    return 'bestaudio[ext=m4a]/bestaudio';
  }

  const heightMap = {
    '1080p': 1080,
    '720p': 720,
    '480p': 480,
    '360p': 360,
  };

  if (quality === 'best' || !heightMap[quality]) {
    return `bestvideo[ext=${format}]+bestaudio/best[ext=${format}]/best`;
  }

  const h = heightMap[quality];
  return `bestvideo[height<=${h}][ext=${format}]+bestaudio/bestvideo[height<=${h}]+bestaudio/best[height<=${h}]`;
};

// ── Public API ────────────────────────────────────────────────

/**
 * Get video metadata (title, duration, formats, thumbnail).
 * Results are cached. videoId must be pre-validated.
 */
export const getVideoInfo = async (videoId) => {
  const cacheKey = `info:${videoId}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.debug('Cache hit for video info', { videoId });
    return cached;
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const raw = await runYtDlp([
    '--dump-json',
    '--no-playlist',
    '--skip-download',
    url,
  ]);

  const data = JSON.parse(raw);

  const info = {
    videoId,
    title: data.title,
    duration: data.duration,           // seconds
    thumbnail: data.thumbnail,
    uploader: data.uploader,
    uploadDate: data.upload_date,
    viewCount: data.view_count,
    // Available formats for quality selector
    formats: (data.formats || [])
      .filter(f => f.vcodec !== 'none' && f.height)
      .map(f => ({
        formatId: f.format_id,
        ext: f.ext,
        height: f.height,
        fps: f.fps,
        filesize: f.filesize,
      }))
      .sort((a, b) => b.height - a.height),
  };

  cache.set(cacheKey, info);
  return info;
};

/**
 * Returns a Node.js Readable stream of the video/audio.
 * Streams directly — nothing is written to disk.
 */
export const downloadStream = (videoId, format, quality, audioOnly = false) => {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const formatSelector = buildFormatSelector(format, quality, audioOnly);

  const args = [
    '--no-playlist',
    '-f', formatSelector,
    '--no-part',
    '-o', '-',             // Output to stdout — enables streaming
  ];

  // For MP3: post-process to extract audio
  if (format === 'mp3' || audioOnly) {
    args.push('--extract-audio', '--audio-format', 'mp3');
  }

  // Use Deno as the JS runtime if available (needed for yt-dlp JS challenge)
  if (process.env.DENO_PATH) {
    args.unshift('--compat-options', 'no-youtube-unavailable-videos');
    process.env.DENO_BINARY = process.env.DENO_PATH;
  }

  args.push(url);

  logger.info('Starting download stream', { videoId, format, quality });
  const proc = spawn(YTDLP, args);

  proc.stderr.on('data', (d) => {
    logger.debug('yt-dlp stderr', { data: d.toString().trim() });
  });

  proc.on('error', (err) => {
    logger.error('yt-dlp spawn error', { error: err.message });
  });

  return proc.stdout;
};

/**
 * Returns a Readable stream for a specific time clip of a video.
 */
export const clipStream = (videoId, startTime, endTime, format) => {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  const args = [
    '--no-playlist',
    '--download-sections', `*${startTime}-${endTime}`,
    '--force-keyframes-at-cuts',
    '-f', format === 'mp3'
      ? 'bestaudio[ext=m4a]/bestaudio'
      : `bestvideo[ext=${format}]+bestaudio/best`,
    '-o', '-',
    url,
  ];

  logger.info('Starting clip stream', { videoId, startTime, endTime, format });
  const proc = spawn(YTDLP, args);

  proc.stderr.on('data', (d) => {
    logger.debug('yt-dlp clip stderr', { data: d.toString().trim() });
  });

  return proc.stdout;
};

/**
 * Check yt-dlp is installed and return its version string.
 */
export const getYtDlpVersion = async () => {
  try {
    return await runYtDlp(['--version']);
  } catch {
    return null;
  }
};
