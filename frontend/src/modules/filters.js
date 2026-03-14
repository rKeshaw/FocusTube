// ============================================================
// FocusTube — Filters Module
// All result filtering logic. Pure functions — no side effects.
// Adding a new filter type: add it here and in constants.js only.
// ============================================================

import { CONFIG } from '../config/constants.js';

/**
 * Remove YouTube Shorts (duration <= threshold).
 */
export const removeShorts = (videos) =>
  videos.filter((v) => (v.duration ?? 0) > CONFIG.SHORTS_THRESHOLD_SECONDS);

/**
 * Apply a named duration filter bucket.
 * filterKey: 'all' | 'short' | 'medium' | 'long'
 */
export const applyDurationFilter = (videos, filterKey = 'all') => {
  const bucket = CONFIG.DURATION_FILTERS[filterKey];
  if (!bucket || filterKey === 'all') return videos;
  return videos.filter(
    (v) => v.duration >= bucket.min && v.duration < bucket.max
  );
};

/**
 * Format seconds into a human-readable duration string.
 * e.g. 3661 → "1:01:01"
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * Format large view counts to human-readable.
 * e.g. 1430000 → "1.4M"
 */
export const formatViewCount = (count) => {
  if (!count) return '';
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return String(count);
};

/**
 * Run all filters in sequence and cap at RESULTS_COUNT.
 */
export const applyAllFilters = (videos, durationFilter = 'all') => {
  const noShorts = removeShorts(videos);
  const filtered = applyDurationFilter(noShorts, durationFilter);
  return filtered.slice(0, CONFIG.RESULTS_COUNT);
};