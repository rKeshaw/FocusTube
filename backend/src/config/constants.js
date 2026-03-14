// ============================================================
// FocusTube Backend — Central Configuration
// To change ANY behavior, change it HERE. Nowhere else.
// ============================================================

export const CONFIG = {
  // Server
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // CORS — comma-separated origins in .env for multiple frontends
  CORS_ORIGINS: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim()),

  // Rate limiting
  RATE_LIMIT: {
    WINDOW_MS: 60 * 60 * 1000,         // 1 hour window
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX || '20'),
    DOWNLOAD_MAX: parseInt(process.env.RATE_LIMIT_DOWNLOAD_MAX || '10'),
  },

  // Download constraints
  DOWNLOAD: {
    ALLOWED_FORMATS: ['mp4', 'mp3', 'webm'],
    ALLOWED_QUALITIES: ['best', '1080p', '720p', '480p', '360p'],
    TIMEOUT_MS: 5 * 60 * 1000,         // Kill stalled downloads after 5 min
    MAX_CLIP_DURATION_SECONDS: 600,     // Max clip = 10 minutes
  },

  // In-memory cache for video info lookups
  CACHE: {
    TTL_MS: 10 * 60 * 1000,            // Cache entries live 10 minutes
    MAX_ENTRIES: 100,                   // LRU eviction after this
  },

  // Binary paths — override in Docker via environment
  YTDLP_PATH: process.env.YTDLP_PATH || 'yt-dlp',
  FFMPEG_PATH: process.env.FFMPEG_PATH || 'ffmpeg',

  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};
