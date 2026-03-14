// ============================================================
// FocusTube — Instance Manager
// Manages Piped API instance health, ranking, and fallback.
// To swap to Invidious or self-hosted: change this file only.
// ============================================================

import { CONFIG } from '../config/constants.js';

let activeInstance = null;

const pingInstance = async (baseUrl) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.INSTANCE_TIMEOUT_MS);
  const start = Date.now();
  try {
    // Use /healthcheck endpoint — more reliable than /trending which is often throttled.
    // Fall back to a known-safe search if healthcheck doesn't exist on the instance.
    const res = await fetch(`${baseUrl}/healthcheck`, { signal: controller.signal });
    clearTimeout(timer);
    // 404 means the instance is alive but doesn't have /healthcheck — still usable
    if (res.ok || res.status === 404) return Date.now() - start;
    return null;
  } catch {
    clearTimeout(timer);
    return null;
  }
};

/**
 * Try a real search on the instance to fully verify it works end-to-end.
 * Used as a deeper check when all ping-based checks fail.
 */
const trySearchInstance = async (baseUrl) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.INSTANCE_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/search?q=test&filter=videos`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    // A valid Piped response always has an 'items' array
    return Array.isArray(data.items) ? 1 : null;
  } catch {
    clearTimeout(timer);
    return null;
  }
};

// Health-check all instances in parallel, pick fastest alive one
export const initInstances = async () => {
  // Try saved preference first
  const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.ACTIVE_INSTANCE);
  if (saved && CONFIG.PIPED_INSTANCES.includes(saved)) {
    const ms = await pingInstance(saved);
    if (ms !== null) {
      activeInstance = saved;
      return activeInstance;
    }
  }

  // Round 1: lightweight ping all instances in parallel
  const results = await Promise.all(
    CONFIG.PIPED_INSTANCES.map(async (url) => ({
      url,
      ms: await pingInstance(url),
    }))
  );

  const alive = results
    .filter((r) => r.ms !== null)
    .sort((a, b) => a.ms - b.ms);

  if (alive.length > 0) {
    activeInstance = alive[0].url;
    localStorage.setItem(CONFIG.STORAGE_KEYS.ACTIVE_INSTANCE, activeInstance);
    return activeInstance;
  }

  // Round 2: all pings failed — try a real search on each instance
  // This handles cases where /healthcheck is blocked but the API itself works
  console.warn('All pings failed — trying deep search check on each instance...');
  for (const url of CONFIG.PIPED_INSTANCES) {
    const ok = await trySearchInstance(url);
    if (ok !== null) {
      activeInstance = url;
      localStorage.setItem(CONFIG.STORAGE_KEYS.ACTIVE_INSTANCE, activeInstance);
      console.info('Instance found via deep check:', url);
      return activeInstance;
    }
  }

  throw new Error('No Piped instances are reachable. Check your connection or add a custom instance in Settings.');
};

// Get active instance, initialising if needed
export const getActiveInstance = async () => {
  if (activeInstance) return activeInstance;
  return await initInstances();
};

// Let user manually pin a specific instance
export const setManualInstance = (url) => {
  activeInstance = url;
  localStorage.setItem(CONFIG.STORAGE_KEYS.ACTIVE_INSTANCE, url);
};

export const clearInstance = () => {
  activeInstance = null;
  localStorage.removeItem(CONFIG.STORAGE_KEYS.ACTIVE_INSTANCE);
};

export const getInstanceList = () => CONFIG.PIPED_INSTANCES;