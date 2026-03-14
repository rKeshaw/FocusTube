// ============================================================
// FocusTube — Storage Module
// All localStorage read/write. Centralised so the key names,
// size limits, and serialisation are never scattered.
// To swap to IndexedDB or a remote store: change this file only.
// ============================================================

import { CONFIG } from '../config/constants.js';

const { STORAGE_KEYS, MAX_SEARCH_HISTORY, MAX_WATCH_LATER, DEFAULT_PREFERENCES } = CONFIG;

// ── Helpers ──────────────────────────────────────────────────

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Storage write failed:', e);
  }
};

// ── Search History ────────────────────────────────────────────

export const getSearchHistory = () =>
  read(STORAGE_KEYS.SEARCH_HISTORY, []);

export const addSearchHistory = (query) => {
  if (!query?.trim()) return;
  const q = query.trim();
  const history = getSearchHistory().filter((h) => h !== q); // dedup
  history.unshift(q);
  write(STORAGE_KEYS.SEARCH_HISTORY, history.slice(0, MAX_SEARCH_HISTORY));
};

export const removeSearchHistory = (query) => {
  const history = getSearchHistory().filter((h) => h !== query);
  write(STORAGE_KEYS.SEARCH_HISTORY, history);
};

export const clearSearchHistory = () => {
  write(STORAGE_KEYS.SEARCH_HISTORY, []);
};

// ── Watch Later ───────────────────────────────────────────────

export const getWatchLater = () =>
  read(STORAGE_KEYS.WATCH_LATER, []);

export const addWatchLater = (video) => {
  const list = getWatchLater().filter((v) => v.videoId !== video.videoId);
  list.unshift({
    videoId:      video.videoId,
    title:        video.title,
    thumbnail:    video.thumbnail,
    duration:     video.duration,
    uploaderName: video.uploaderName,
    savedAt:      Date.now(),
  });
  write(STORAGE_KEYS.WATCH_LATER, list.slice(0, MAX_WATCH_LATER));
};

export const removeWatchLater = (videoId) => {
  const list = getWatchLater().filter((v) => v.videoId !== videoId);
  write(STORAGE_KEYS.WATCH_LATER, list);
};

export const isInWatchLater = (videoId) =>
  getWatchLater().some((v) => v.videoId === videoId);

export const clearWatchLater = () => {
  write(STORAGE_KEYS.WATCH_LATER, []);
};

// ── Preferences ───────────────────────────────────────────────

export const getPreferences = () => ({
  ...DEFAULT_PREFERENCES,
  ...read(STORAGE_KEYS.PREFERENCES, {}),
});

export const setPreference = (key, value) => {
  const prefs = getPreferences();
  write(STORAGE_KEYS.PREFERENCES, { ...prefs, [key]: value });
};

export const resetPreferences = () => {
  write(STORAGE_KEYS.PREFERENCES, DEFAULT_PREFERENCES);
};