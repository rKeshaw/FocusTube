// ============================================================
// FocusTube — Search Module
// Primary: Invidious API.
// Fallback: YouTube Data API v3 (requires VITE_YOUTUBE_API_KEY).
// Stream resolution: Invidious video endpoint, falls back to embed.
// To change search provider: change this file only.
// ============================================================

import { getActiveInstance, initInstances } from './instanceManager.js';
import { applyAllFilters } from './filters.js';
import { CONFIG } from '../config/constants.js';

// ── Normalisers ───────────────────────────────────────────────

// Invidious search result → internal video shape
const normaliseInvidious = (item) => ({
  videoId:      item.videoId ?? '',
  title:        item.title ?? 'Untitled',
  thumbnail:    getBestInvidiousThumbnail(item.videoThumbnails),
  duration:     item.lengthSeconds ?? 0,
  viewCount:    item.viewCount ?? 0,
  uploaderName: item.author ?? '',
  uploaderUrl:  item.authorUrl ?? '',
  uploadedDate: item.publishedText ?? '',
  description:  item.description ?? '',
});

// YouTube Data API v3 search result → internal video shape.
// The search endpoint returns snippet only; duration requires a separate
// videos endpoint call which we batch in searchYouTube below.
const normaliseYouTube = (item, durationMap = {}) => {
  const id = item.id?.videoId ?? '';
  const snippet = item.snippet ?? {};
  return {
    videoId:      id,
    title:        snippet.title ?? 'Untitled',
    thumbnail:    snippet.thumbnails?.high?.url
               ?? snippet.thumbnails?.medium?.url
               ?? snippet.thumbnails?.default?.url
               ?? '',
    duration:     durationMap[id] ?? 0,
    viewCount:    0, // not returned by search endpoint
    uploaderName: snippet.channelTitle ?? '',
    uploaderUrl:  '',
    uploadedDate: snippet.publishedAt
                  ? new Date(snippet.publishedAt).toLocaleDateString()
                  : '',
    description:  snippet.description ?? '',
  };
};

// Pick the highest-resolution thumbnail from Invidious's array.
const getBestInvidiousThumbnail = (thumbs = []) => {
  if (!thumbs || thumbs.length === 0) return '';
  const preferred = ['maxres', 'sddefault', 'high', 'medium', 'default'];
  for (const quality of preferred) {
    const t = thumbs.find((t) => t.quality === quality);
    if (t?.url) return t.url;
  }
  return thumbs[0]?.url ?? '';
};

// ── Invidious Search ─────────────────────────────────────────

const searchInvidious = async (query) => {
  const instance = await getActiveInstance();
  const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&fields=videoId,title,videoThumbnails,lengthSeconds,viewCount,author,authorUrl,publishedText,description`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Invidious search failed: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('Unexpected Invidious response shape');
  return data.map(normaliseInvidious);
};

// ── YouTube Data API v3 Search ────────────────────────────────

// Fetch ISO 8601 durations for a list of video IDs and convert to seconds.
const fetchYouTubeDurations = async (videoIds) => {
  if (!videoIds.length) return {};
  const params = new URLSearchParams({
    part: 'contentDetails',
    id: videoIds.join(','),
    key: CONFIG.YOUTUBE_API_KEY,
  });
  const res = await fetch(`${CONFIG.YOUTUBE_VIDEOS_URL}?${params}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return {};
  const data = await res.json();
  const map = {};
  for (const item of data.items ?? []) {
    map[item.id] = parseISO8601Duration(item.contentDetails?.duration ?? '');
  }
  return map;
};

// Parse ISO 8601 duration string (PT1H2M3S) to seconds.
const parseISO8601Duration = (iso) => {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] ?? 0);
  const m = parseInt(match[2] ?? 0);
  const s = parseInt(match[3] ?? 0);
  return h * 3600 + m * 60 + s;
};

const searchYouTube = async (query) => {
  if (!CONFIG.YOUTUBE_API_KEY) {
    throw new Error(
      'YouTube API key not configured. Add VITE_YOUTUBE_API_KEY to your .env file.'
    );
  }

  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: 25,
    key: CONFIG.YOUTUBE_API_KEY,
  });

  const res = await fetch(`${CONFIG.YOUTUBE_SEARCH_URL}?${params}`, {
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err?.error?.message ?? `YouTube search failed: ${res.status}`
    );
  }

  const data = await res.json();
  const items = data.items ?? [];
  const videoIds = items.map((i) => i.id?.videoId).filter(Boolean);

  // Batch-fetch durations so we can filter Shorts and apply duration filters.
  const durationMap = await fetchYouTubeDurations(videoIds);

  return items.map((item) => normaliseYouTube(item, durationMap));
};

// ── Public: searchVideos ──────────────────────────────────────

export const searchVideos = async (query, durationFilter = 'all') => {
  if (!query?.trim()) return [];

  // ── Try Invidious first ──
  try {
    const raw = await searchInvidious(query.trim());
    return applyAllFilters(raw, durationFilter);
  } catch (invidiousErr) {
    console.warn('Invidious search failed:', invidiousErr.message);

    // Instance may have gone stale — re-rank and retry once.
    try {
      await initInstances();
      const raw = await searchInvidious(query.trim());
      return applyAllFilters(raw, durationFilter);
    } catch (retryErr) {
      console.warn('Invidious retry failed:', retryErr.message);
    }
  }

  // ── Fall back to YouTube Data API v3 ──
  console.info('Falling back to YouTube Data API v3.');
  try {
    const raw = await searchYouTube(query.trim());
    return applyAllFilters(raw, durationFilter);
  } catch (ytErr) {
    // Both sources failed — surface a clear error.
    const noKey = !CONFIG.YOUTUBE_API_KEY;
    throw new Error(
      noKey
        ? 'Search unavailable: no Invidious instances reachable and no YouTube API key configured. Add VITE_YOUTUBE_API_KEY to your .env file.'
        : `Search unavailable: ${ytErr.message}`
    );
  }
};

// ── Public: getVideoStreams ───────────────────────────────────

// Fetches stream URLs for a videoId via Invidious.
// Returns a result object that player.js understands.
// If Invidious fails, returns { embedFallback: true } so
// PlayerView can render a YouTube iframe instead.
export const getVideoStreams = async (videoId) => {
  // Try Invidious stream data
  try {
    const instance = await getActiveInstance();
    const res = await fetch(`${instance}/api/v1/videos/${videoId}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Invidious video endpoint: ${res.status}`);
    const data = await res.json();

    const hlsUrl = data.hlsUrl ?? null;

    // Prefer adaptive streams that include audio (formatStreams).
    // legacyFormats are muxed video+audio at lower quality but more compatible.
    const muxedStreams = (data.formatStreams ?? [])
      .map((s) => ({
        url:      s.url,
        quality:  s.qualityLabel ?? s.quality ?? '',
        mimeType: s.type ?? '',
        codec:    s.encoding ?? '',
      }))
      .sort((a, b) => {
        const qa = parseInt(a.quality) || 0;
        const qb = parseInt(b.quality) || 0;
        return qb - qa;
      });

    const directUrl = muxedStreams[0]?.url ?? null;

    if (!hlsUrl && !directUrl) throw new Error('No playable streams in Invidious response');

    return {
      videoId,
      title:       data.title ?? '',
      duration:    data.lengthSeconds ?? 0,
      thumbnail:   getBestInvidiousThumbnail(data.videoThumbnails),
      uploader:    data.author ?? '',
      hlsUrl,
      directUrl,
      streams:     muxedStreams,
      embedFallback: false,
    };
  } catch (err) {
    console.warn('Invidious stream fetch failed — using embed fallback:', err.message);
    // Signal to PlayerView to render a YouTube iframe.
    return {
      videoId,
      embedFallback: true,
    };
  }
};