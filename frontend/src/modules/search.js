// ============================================================
// FocusTube — Search Module
// All search logic. Calls instanceManager, filters results.
// To change the search API: change this file only.
// ============================================================

import { getActiveInstance, initInstances } from './instanceManager.js';
import { applyAllFilters } from './filters.js';
import { CONFIG } from '../config/constants.js';

/**
 * Normalise a raw Piped search item into our internal video shape.
 */
const normaliseVideo = (item) => ({
  videoId:     item.url?.replace('/watch?v=', '') ?? '',
  title:       item.title ?? 'Untitled',
  thumbnail:   item.thumbnail ?? '',
  duration:    item.duration ?? 0,
  viewCount:   item.views ?? 0,
  uploaderName: item.uploaderName ?? '',
  uploaderUrl:  item.uploaderUrl ?? '',
  uploadedDate: item.uploadedDate ?? '',
  description: item.shortDescription ?? '',
});

/**
 * Search for videos.
 * Returns filtered, normalised array of up to RESULTS_COUNT videos.
 * Retries on a fresh instance if the first attempt fails.
 */
export const searchVideos = async (query, durationFilter = 'all') => {
  if (!query || query.trim().length === 0) return [];

  // Fetch more than we need to have headroom after filtering Shorts
  const fetchCount = Math.min(CONFIG.RESULTS_COUNT * 2, 50);

  const doSearch = async () => {
    const instance = await getActiveInstance();
    const url = `${instance}/search?q=${encodeURIComponent(query.trim())}&filter=videos`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    const data = await res.json();
    return (data.items ?? [])
      .filter((item) => item.type === 'stream')
      .map(normaliseVideo);
  };

  try {
    const raw = await doSearch();
    return applyAllFilters(raw, durationFilter);
  } catch (err) {
    // First attempt failed — clear cached instance and retry once
    console.warn('Search failed on primary instance, retrying...', err.message);
    try {
      await initInstances(); // re-rank instances
      const raw = await doSearch();
      return applyAllFilters(raw, durationFilter);
    } catch (retryErr) {
      throw new Error(`Search unavailable: ${retryErr.message}`);
    }
  }
};

/**
 * Fetch stream URLs for a videoId via Piped.
 * Returns { videoUrl, audioUrl, title, duration, hls }
 */
export const getVideoStreams = async (videoId) => {
  const instance = await getActiveInstance();
  const res = await fetch(`${instance}/streams/${videoId}`);
  if (!res.ok) throw new Error(`Could not fetch stream for ${videoId}`);
  const data = await res.json();

  // Prefer HLS for broad compatibility (required for iOS Safari)
  // Fall back to best available video stream
  const hlsUrl = data.hls ?? null;

  // Pick best non-HLS video stream (for browsers that support DASH/MP4 directly)
  const videoStreams = (data.videoStreams ?? [])
    .filter((s) => s.videoOnly === false) // streams with audio included
    .sort((a, b) => (b.quality?.replace('p', '') ?? 0) - (a.quality?.replace('p', '') ?? 0));

  const bestStream = videoStreams[0]?.url ?? null;

  return {
    videoId,
    title:      data.title ?? '',
    duration:   data.duration ?? 0,
    thumbnail:  data.thumbnailUrl ?? '',
    uploader:   data.uploader ?? '',
    hlsUrl,
    directUrl:  bestStream,
    // Provide all streams for quality selector
    streams: videoStreams.map((s) => ({
      url:     s.url,
      quality: s.quality,
      codec:   s.codec,
      mimeType: s.mimeType,
    })),
  };
};