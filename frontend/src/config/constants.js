// ============================================================
// FocusTube Frontend — Central Configuration
// Every product decision lives here. One file to rule them all.
// ============================================================

export const CONFIG = {
  // Results
  RESULTS_COUNT: 20,
  SHORTS_THRESHOLD_SECONDS: 62, // Videos <= this are considered Shorts

  // Piped API instances — expanded list from official registry (March 2026)
  // Ordered roughly by reliability. instanceManager will auto-pick fastest alive one.
  PIPED_INSTANCES: [
    'https://pipedapi.kavin.rocks',            // Official — most reliable
    'https://pipedapi-libre.kavin.rocks',      // Official libre (no CDN)
    'https://piped-api.privacy.com.de',        // Germany
    'https://pipedapi.adminforge.de',          // Germany
    'https://api.piped.yt',                    // Germany
    'https://pipedapi.leptons.xyz',            // Austria
    'https://pipedapi.nosebs.ru',              // Finland
    'https://pipedapi.drgns.space',            // USA
    'https://api.piped.projectsegfau.lt',      // EU
  ],

  // Instance health check timeout (ms) — raised to handle slow instances from India
  INSTANCE_TIMEOUT_MS: 8000,

  // Backend API — change this when deploying to production
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000',

  // Duration filter buckets (seconds)
  DURATION_FILTERS: {
    all:    { label: 'All',    min: 0,    max: Infinity },
    short:  { label: 'Short', min: 62,   max: 240  },   // 1–4 min
    medium: { label: 'Medium', min: 240,  max: 1200 },   // 4–20 min
    long:   { label: 'Long',  min: 1200, max: Infinity },// 20+ min
  },

  // Local storage keys — all in one place to avoid typos
  STORAGE_KEYS: {
    SEARCH_HISTORY:   'ft_search_history',
    WATCH_LATER:      'ft_watch_later',
    PREFERENCES:      'ft_preferences',
    ACTIVE_INSTANCE:  'ft_active_instance',
  },

  // Search history
  MAX_SEARCH_HISTORY: 30,

  // Watch Later
  MAX_WATCH_LATER: 200,

  // Default user preferences
  DEFAULT_PREFERENCES: {
    theme: 'warm',       // 'warm' | 'dark' | 'light' | 'mono'
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