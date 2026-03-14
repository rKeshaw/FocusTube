// ============================================================
// FocusTube — Instance Manager
// Manages Invidious API instance discovery and health checks.
// Fetches the live instance list at runtime so it never goes stale.
// To swap back to Piped or another provider: change this file only.
// ============================================================

import { CONFIG } from '../config/constants.js';

let activeInstance = null;

// Fetch the live Invidious instance list from the official API.
// Returns an array of base URLs for API-enabled instances.
const fetchInstanceList = async () => {
  try {
    const res = await fetch(CONFIG.INVIDIOUS_INSTANCES_API, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error('instances API non-OK');
    const data = await res.json();
    // Response is an array of [name, {uri, api, type, ...}] pairs.
    // Keep only instances that have the API enabled and use HTTPS.
    return data
      .filter(([, info]) => info.api === true && info.uri?.startsWith('https'))
      .map(([, info]) => info.uri.replace(/\/$/, ''));
  } catch {
    console.warn('Could not fetch live Invidious instance list — using fallback.');
    return CONFIG.INVIDIOUS_INSTANCES_FALLBACK;
  }
};

// Test a single instance by running a real search.
// Returns the URL if the instance responds correctly, null otherwise.
const testInstance = async (baseUrl) => {
  try {
    const res = await fetch(
      `${baseUrl}/api/v1/search?q=test&type=video`,
      { signal: AbortSignal.timeout(CONFIG.INSTANCE_TIMEOUT_MS) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? baseUrl : null;
  } catch {
    return null;
  }
};

// Health-check all instances concurrently — first working one wins.
export const initInstances = async () => {
  // Re-validate any saved manual preference first.
  const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.ACTIVE_INSTANCE);
  if (saved) {
    const ok = await testInstance(saved);
    if (ok) {
      activeInstance = saved;
      return activeInstance;
    }
    // Saved instance is dead — clear it and fall through.
    localStorage.removeItem(CONFIG.STORAGE_KEYS.ACTIVE_INSTANCE);
  }

  const list = await fetchInstanceList();

  // Promise.any resolves with the first non-rejected result.
  // testInstance returns null on failure, so we reject nulls explicitly.
  const result = await Promise.any(
    list.map((url) =>
      testInstance(url).then((r) => {
        if (!r) throw new Error('dead');
        return r;
      })
    )
  ).catch(() => null);

  if (!result) {
    throw new Error(
      'No Invidious instances are reachable. Check your connection or add a custom instance in Settings.'
    );
  }

  activeInstance = result;
  localStorage.setItem(CONFIG.STORAGE_KEYS.ACTIVE_INSTANCE, activeInstance);
  return activeInstance;
};

// Get the active instance URL, initialising if not yet resolved.
export const getActiveInstance = async () => {
  if (activeInstance) return activeInstance;
  return initInstances();
};

// Let the user manually pin a specific instance.
export const setManualInstance = (url) => {
  activeInstance = url;
  localStorage.setItem(CONFIG.STORAGE_KEYS.ACTIVE_INSTANCE, url);
};

export const clearInstance = () => {
  activeInstance = null;
  localStorage.removeItem(CONFIG.STORAGE_KEYS.ACTIVE_INSTANCE);
};

// Used by SettingsPanel to render the instance list.
export const getInstanceList = () => CONFIG.INVIDIOUS_INSTANCES_FALLBACK;