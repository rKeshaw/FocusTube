// ============================================================
// FocusTube — ffmpeg Service
// THE ONLY FILE that directly invokes ffmpeg.
// Used for post-processing: merging streams, converting formats.
// Swap ffmpeg for cloud transcoding? Change ONLY this file.
// ============================================================

import { spawn } from 'child_process';
import { CONFIG } from '../config/constants.js';
import { logger } from '../utils/logger.js';

const FFMPEG = CONFIG.FFMPEG_PATH;

/**
 * Check ffmpeg is installed and return its version string.
 */
export const getFfmpegVersion = async () => {
  return new Promise((resolve) => {
    const proc = spawn(FFMPEG, ['-version']);
    let out = '';
    proc.stdout.on('data', (d) => { out += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) {
        // First line: "ffmpeg version X.X.X ..."
        resolve(out.split('\n')[0].trim());
      } else {
        resolve(null);
      }
    });
    proc.on('error', () => resolve(null));
  });
};

/**
 * Convert a readable stream to MP3 using ffmpeg.
 * Returns a new readable stream of the MP3 output.
 * Used when yt-dlp outputs a raw audio stream needing conversion.
 */
export const convertToMp3 = (inputStream, bitrate = '192k') => {
  logger.debug('ffmpeg converting stream to mp3', { bitrate });

  const proc = spawn(FFMPEG, [
    '-i', 'pipe:0',          // Read from stdin
    '-vn',                   // No video
    '-ar', '44100',          // Audio sample rate
    '-ac', '2',              // Stereo
    '-b:a', bitrate,
    '-f', 'mp3',
    'pipe:1',                // Output to stdout
  ]);

  proc.stderr.on('data', (d) => {
    logger.debug('ffmpeg stderr', { data: d.toString().trim() });
  });

  proc.on('error', (err) => {
    logger.error('ffmpeg spawn error', { error: err.message });
  });

  inputStream.pipe(proc.stdin);
  return proc.stdout;
};

/**
 * Trim a stream to exact start/end times using ffmpeg.
 * Returns a readable stream of the trimmed output.
 */
export const trimStream = (inputStream, startTime, endTime, format) => {
  const duration = endTime - startTime;
  logger.debug('ffmpeg trimming stream', { startTime, endTime, duration, format });

  const outputFormat = format === 'mp3' ? 'mp3' : 'mp4';

  const args = [
    '-i', 'pipe:0',
    '-ss', String(startTime),
    '-t', String(duration),
    '-c', 'copy',            // Copy streams without re-encoding (fast)
    '-f', outputFormat,
    'pipe:1',
  ];

  // MP4 in a stream needs fragmented format
  if (outputFormat === 'mp4') {
    args.splice(-2, 0, '-movflags', 'frag_keyframe+empty_moov');
  }

  const proc = spawn(FFMPEG, args);

  proc.stderr.on('data', (d) => {
    logger.debug('ffmpeg trim stderr', { data: d.toString().trim() });
  });

  inputStream.pipe(proc.stdin);
  return proc.stdout;
};
