// ============================================================
// FocusTube — Cache Service
// Simple in-memory LRU cache for video metadata.
// Prevents hammering yt-dlp for the same video repeatedly.
// To swap for Redis: change only this file.
// ============================================================

import { CONFIG } from '../config/constants.js';
import { logger } from '../utils/logger.js';

class LRUCache {
  constructor(maxEntries, ttlMs) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    // Map preserves insertion order — oldest entry is first
    this.store = new Map();
  }

  get(key) {
    if (!this.store.has(key)) return null;
    const entry = this.store.get(key);

    // Check TTL expiry
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.store.delete(key);
      logger.debug('Cache entry expired', { key });
      return null;
    }

    // Move to end (most recently used)
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    // Evict oldest entry if at capacity
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      this.store.delete(oldestKey);
      logger.debug('Cache evicted oldest entry', { evicted: oldestKey });
    }

    this.store.set(key, { value, timestamp: Date.now() });
    logger.debug('Cache set', { key });
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  get size() {
    return this.store.size;
  }
}

// Singleton instance used across the app
export const cache = new LRUCache(
  CONFIG.CACHE.MAX_ENTRIES,
  CONFIG.CACHE.TTL_MS
);
