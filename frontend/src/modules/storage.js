// ============================================================
// FocusTube — Storage Module
// localStorage: search history, watch later, watch history, preferences.
// IndexedDB: downloaded video blobs (too large for localStorage).
// To swap storage backends: change this file only.
// ============================================================

import { CONFIG } from '../config/constants.js';

const { STORAGE_KEYS, MAX_SEARCH_HISTORY, MAX_WATCH_LATER, DEFAULT_PREFERENCES } = CONFIG;
const MAX_WATCH_HISTORY = 200;

// ── localStorage helpers ──────────────────────────────────────

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

// Dispatch a lightweight DOM event so any listener in the app
// can react to watch later changes without prop drilling.
const notifyWatchLaterChange = () => {
  window.dispatchEvent(new CustomEvent('ft:watchlater-changed'));
};

// ── Search History ────────────────────────────────────────────

export const getSearchHistory = () => read(STORAGE_KEYS.SEARCH_HISTORY, []);

export const addSearchHistory = (query) => {
  if (!query?.trim()) return;
  const q = query.trim();
  const history = getSearchHistory().filter((h) => h !== q);
  history.unshift(q);
  write(STORAGE_KEYS.SEARCH_HISTORY, history.slice(0, MAX_SEARCH_HISTORY));
};

export const removeSearchHistory = (query) => {
  write(STORAGE_KEYS.SEARCH_HISTORY, getSearchHistory().filter((h) => h !== query));
};

export const clearSearchHistory = () => write(STORAGE_KEYS.SEARCH_HISTORY, []);

// ── Watch Later ───────────────────────────────────────────────

export const getWatchLater = () => read(STORAGE_KEYS.WATCH_LATER, []);

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
  notifyWatchLaterChange();
};

export const removeWatchLater = (videoId) => {
  write(STORAGE_KEYS.WATCH_LATER, getWatchLater().filter((v) => v.videoId !== videoId));
  notifyWatchLaterChange();
};

export const isInWatchLater = (videoId) => getWatchLater().some((v) => v.videoId === videoId);

export const clearWatchLater = () => {
  write(STORAGE_KEYS.WATCH_LATER, []);
  notifyWatchLaterChange();
};

// ── Watch History ─────────────────────────────────────────────

export const getWatchHistory = () => read(STORAGE_KEYS.WATCH_HISTORY, []);

export const addWatchHistory = (video) => {
  if (!video?.videoId) return;
  const list = getWatchHistory().filter((v) => v.videoId !== video.videoId);
  list.unshift({
    videoId:      video.videoId,
    title:        video.title,
    thumbnail:    video.thumbnail,
    duration:     video.duration,
    uploaderName: video.uploaderName,
    watchedAt:    Date.now(),
  });
  write(STORAGE_KEYS.WATCH_HISTORY, list.slice(0, MAX_WATCH_HISTORY));
};

export const clearWatchHistory = () => write(STORAGE_KEYS.WATCH_HISTORY, []);

// ── Preferences ───────────────────────────────────────────────

export const getPreferences = () => ({
  ...DEFAULT_PREFERENCES,
  ...read(STORAGE_KEYS.PREFERENCES, {}),
});

export const setPreference = (key, value) => {
  write(STORAGE_KEYS.PREFERENCES, { ...getPreferences(), [key]: value });
};

export const resetPreferences = () => write(STORAGE_KEYS.PREFERENCES, DEFAULT_PREFERENCES);

// ── Downloads — IndexedDB ─────────────────────────────────────

const DB_NAME    = 'focustube_downloads';
const DB_VERSION = 1;
const STORE      = 'downloads';

const openDB = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, DB_VERSION);
  req.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains(STORE)) {
      const store = db.createObjectStore(STORE, { keyPath: 'videoId' });
      store.createIndex('savedAt', 'savedAt', { unique: false });
    }
  };
  req.onsuccess = (e) => resolve(e.target.result);
  req.onerror   = (e) => reject(e.target.error);
});

export const saveDownload = async (video, blob, format, quality) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.put({
      videoId:      video.videoId,
      title:        video.title,
      thumbnail:    video.thumbnail,
      duration:     video.duration,
      uploaderName: video.uploaderName,
      format,
      quality,
      size:         blob.size,
      blob,
      savedAt:      Date.now(),
    });
    tx.oncomplete = resolve;
    tx.onerror    = (e) => reject(e.target.error);
  });
};

export const getDownloads = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req   = store.index('savedAt').getAll();
    req.onsuccess = (e) => resolve([...e.target.result].reverse());
    req.onerror   = (e) => reject(e.target.error);
  });
};

export const deleteDownload = async (videoId) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.delete(videoId);
    tx.oncomplete = resolve;
    tx.onerror    = (e) => reject(e.target.error);
  });
};

export const clearDownloads = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = resolve;
    tx.onerror    = (e) => reject(e.target.error);
  });
};