// ============================================================
// FocusTube — yt-dlp Service
// THE ONLY FILE that directly invokes yt-dlp.
// Routes and other services call this — they never touch yt-dlp.
// Swap yt-dlp for another tool? Change ONLY this file.
// ============================================================

import { spawn } from 'child_process';
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
    '720p':  720,
    '480p':  480,
    '360p':  360,
  };

  if (quality === 'best' || !heightMap[quality]) {
    return `bestvideo[ext=${format}]+bestaudio/best[ext=${format}]/best`;
  }

  const h = heightMap[quality];
  return `bestvideo[height<=${h}][ext=${format}]+bestaudio/bestvideo[height<=${h}]+bestaudio/best[height<=${h}]`;
};

/**
 * Normalise a raw yt-dlp JSON entry into the internal video shape
 * shared between search results and video info responses.
 */
const normaliseEntry = (data) => ({
  videoId:      data.id ?? '',
  title:        data.title ?? 'Untitled',
  // yt-dlp returns thumbnails as an array sorted ascending by resolution.
  // Take the last entry (highest resolution) when available.
  thumbnail:    data.thumbnails?.at(-1)?.url ?? data.thumbnail ?? '',
  duration:     data.duration ?? 0,
  viewCount:    data.view_count ?? 0,
  uploaderName: data.uploader ?? data.channel ?? '',
  uploaderUrl:  data.uploader_url ?? data.channel_url ?? '',
  uploadedDate: data.upload_date
    // upload_date is YYYYMMDD — convert to a readable string
    ? `${data.upload_date.slice(0,4)}-${data.upload_date.slice(4,6)}-${data.upload_date.slice(6,8)}`
    : '',
  description:  data.description ?? '',
});

// ── Public API ────────────────────────────────────────────────

/**
 * Search YouTube via yt-dlp's ytsearch extractor.
 * Returns up to `limit` normalised video objects.
 * Results are NOT cached — queries vary too widely.
 */
export const searchVideos = async (query, limit = 20) => {
  const cacheKey = `search:${query}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.debug('Cache hit for search', { query });
    return cached;
  }

  // ytsearch{n}:{query} tells yt-dlp to use the YouTube search extractor.
  // --dump-json emits one JSON object per line (NDJSON).
  // --skip-download ensures no media is fetched.
  // --flat-playlist prevents yt-dlp from expanding each result into a full
  //   video info fetch, keeping search fast.
  const raw = await runYtDlp([
    `ytsearch${limit}:${query}`,
    '--dump-json',
    '--skip-download',
    '--flat-playlist',
    '--no-warnings',
  ]);

  // yt-dlp outputs one JSON object per line for playlist/search results.
  const results = raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .map(normaliseEntry)
    // Drop entries with no videoId — malformed results
    .filter((v) => v.videoId);

  cache.set(cacheKey, results);
  return results;
};

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
    title:      data.title,
    duration:   data.duration,
    thumbnail:  data.thumbnails?.at(-1)?.url ?? data.thumbnail,
    uploader:   data.uploader ?? data.channel ?? '',
    uploadDate: data.upload_date,
    viewCount:  data.view_count,
    formats: (data.formats || [])
      .filter(f => f.vcodec !== 'none' && f.height)
      .map(f => ({
        formatId: f.format_id,
        ext:      f.ext,
        height:   f.height,
        fps:      f.fps,
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
    '-o', '-',
  ];

  if (format === 'mp3' || audioOnly) {
    args.push('--extract-audio', '--audio-format', 'mp3');
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