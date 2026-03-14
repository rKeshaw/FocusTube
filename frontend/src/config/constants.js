// ============================================================
// FocusTube Frontend — Central Configuration
// Every product decision lives here. One file to rule them all.
// ============================================================

export const CONFIG = {
  // Results
  RESULTS_COUNT: 20,
  SHORTS_THRESHOLD_SECONDS: 62, // Videos <= this are considered Shorts

  // ── Invidious (primary search + stream source) ─────────────
  // Live instance list fetched at runtime from the Invidious API.
  INVIDIOUS_INSTANCES_API: 'https://api.invidious.io/instances.json',

  // Fallback list used only when the instances API itself is unreachable.
  // These are long-running public instances — still may fail; fallback exists.
  INVIDIOUS_INSTANCES_FALLBACK: [
    'https://invidious.snopyta.org',
    'https://invidious.kavin.rocks',
    'https://vid.puffyan.us',
    'https://invidious.nerdvpn.de',
    'https://inv.riverside.rocks',
    'https://invidious.tiekoetter.com',
    'https://invidious.slipfox.xyz',
    'https://invidious.privacydev.net',
    'https://iv.datura.network',
    'https://invidious.fdn.fr',
  ],

  // How long to wait for each instance to respond to a test search.
  INSTANCE_TIMEOUT_MS: 6000,

  // ── YouTube Data API v3 (fallback search) ──────────────────
  // Used when no Invidious instance is reachable.
  // Set VITE_YOUTUBE_API_KEY in your .env file.
  // Get a key: https://console.cloud.google.com → YouTube Data API v3
  YOUTUBE_API_KEY: import.meta.env.VITE_YOUTUBE_API_KEY || '',
  YOUTUBE_SEARCH_URL: 'https://www.googleapis.com/youtube/v3/search',
  YOUTUBE_VIDEOS_URL: 'https://www.googleapis.com/youtube/v3/videos',

  // ── Backend API ────────────────────────────────────────────
  // Change this when deploying to production.
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000',

  // Duration filter buckets (seconds)
  DURATION_FILTERS: {
    all:    { label: 'All',    min: 0,    max: Infinity },
    short:  { label: 'Short',  min: 62,   max: 240      }, // 1–4 min
    medium: { label: 'Medium', min: 240,  max: 1200     }, // 4–20 min
    long:   { label: 'Long',   min: 1200, max: Infinity  }, // 20+ min
  },

  // Local storage keys — all in one place to avoid typos
  STORAGE_KEYS: {
    SEARCH_HISTORY:  'ft_search_history',
    WATCH_LATER:     'ft_watch_later',
    PREFERENCES:     'ft_preferences',
    ACTIVE_INSTANCE: 'ft_active_instance',
  },

  // Search history
  MAX_SEARCH_HISTORY: 30,

  // Watch Later
  MAX_WATCH_LATER: 200,

  // Default user preferences
  DEFAULT_PREFERENCES: {
    theme:         'warm', // 'warm' | 'dark' | 'light' | 'mono'
    defaultFilter: 'all',
    playbackSpeed: 1,
  },

  // Themes — CSS class applied to <html>
  THEMES: {
    warm:  { label: 'Warm',  class: 'theme-warm'  },
    dark:  { label: 'Dark',  class: 'theme-dark'  },
    light: { label: 'Light', class: 'theme-light' },
    mono:  { label: 'Mono',  class: 'theme-mono'  },
  },
};