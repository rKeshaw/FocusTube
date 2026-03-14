// ============================================================
// FocusTube Frontend — Central Configuration
// ============================================================

export const CONFIG = {
  RESULTS_COUNT: 20,
  SHORTS_THRESHOLD_SECONDS: 62,

  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000',

  DURATION_FILTERS: {
    all:    { label: 'All',    min: 0,    max: Infinity },
    short:  { label: 'Short',  min: 62,   max: 240      },
    medium: { label: 'Medium', min: 240,  max: 1200     },
    long:   { label: 'Long',   min: 1200, max: Infinity  },
  },

  STORAGE_KEYS: {
    SEARCH_HISTORY: 'ft_search_history',
    WATCH_LATER:    'ft_watch_later',
    WATCH_HISTORY:  'ft_watch_history',
    PREFERENCES:    'ft_preferences',
  },

  MAX_SEARCH_HISTORY: 30,
  MAX_WATCH_LATER: 200,

  DEFAULT_PREFERENCES: {
    theme:         'warm',
    defaultFilter: 'all',
    playbackSpeed: 1,
  },

  THEMES: {
    warm:  { label: 'Warm',  class: 'theme-warm'  },
    dark:  { label: 'Dark',  class: 'theme-dark'  },
    light: { label: 'Light', class: 'theme-light' },
    mono:  { label: 'Mono',  class: 'theme-mono'  },
  },
};