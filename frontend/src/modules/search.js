// ============================================================
// FocusTube — Search Module
// All search goes through the FocusTube backend (/api/search).
// The backend uses yt-dlp's YouTube search extractor directly.
// No Invidious. No YouTube Data API. No third-party dependency.
// To change search behaviour: change the backend ytdlp.service.js.
// ============================================================

import { applyAllFilters } from './filters.js';
import { CONFIG } from '../config/constants.js';

// ── Search ────────────────────────────────────────────────────

export const searchVideos = async (query, durationFilter = 'all') => {
  if (!query?.trim()) return [];

  const params = new URLSearchParams({
    q:     query.trim(),
    limit: CONFIG.RESULTS_COUNT,
  });

  const res = await fetch(`${CONFIG.BACKEND_URL}/api/search?${params}`, {
    signal: AbortSignal.timeout(30000), // yt-dlp search can take ~5s; allow headroom
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Search failed: ${res.status}`);
  }

  const { data } = await res.json();

  // applyAllFilters: removes Shorts, applies duration bucket, caps count.
  return applyAllFilters(data, durationFilter);
};

// ── Stream resolution ─────────────────────────────────────────

// Returns the backend proxy stream URL and video metadata.
// The backend route GET /api/stream/:videoId handles yt-dlp invocation
// and proxies the CDN bytes with range request support.
// No YouTube iframe. No expiring signed URLs. No third-party dependency.
export const getVideoStreams = async (videoId, quality = 'best') => {
  // Fetch metadata (title, duration, thumbnail) from the info endpoint.
  // This is a fast cached call — does not trigger a download.
  let meta = {};
  try {
    const res = await fetch(
      `${CONFIG.BACKEND_URL}/api/info/${videoId}`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (res.ok) {
      const body = await res.json();
      meta = body.data ?? {};
    }
  } catch {
    // Non-fatal — metadata is display-only; stream can still play
  }

  const params = new URLSearchParams({ quality });

  return {
    videoId,
    title:         meta.title ?? '',
    duration:      meta.duration ?? 0,
    thumbnail:     meta.thumbnail ?? '',
    uploader:      meta.uploader ?? '',
    // The stream URL is a backend proxy endpoint.
    // The browser never talks to YouTube directly for playback.
    streamUrl:     `${CONFIG.BACKEND_URL}/api/stream/${videoId}?${params}`,
    embedFallback: false,
  };
};