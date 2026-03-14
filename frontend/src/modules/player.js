// ============================================================
// FocusTube — Player Module
// ALL player logic isolated here. PlayerView.jsx is UI only.
// To swap Plyr for another player: change this file only.
// ============================================================

import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

/**
 * Detect if the current browser is iOS Safari.
 * iOS requires HLS streams and the playsinline attribute.
 */
export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

/**
 * Detect if the browser supports HLS natively (Safari/iOS).
 * Chromium-based browsers need a JS HLS library instead.
 */
export const supportsHLSnatively = () => {
  const video = document.createElement('video');
  return video.canPlayType('application/vnd.apple.mpegurl') !== '';
};

/**
 * Pick the best stream URL from the Piped stream data.
 * Prefers HLS on iOS (required), direct MP4/WebM elsewhere.
 */
export const resolveStreamUrl = (streamData) => {
  const { hlsUrl, directUrl, streams } = streamData;

  if (isIOS() || supportsHLSnatively()) {
    if (hlsUrl) return { url: hlsUrl, type: 'hls' };
  }

  if (directUrl) return { url: directUrl, type: 'direct' };

  // Fallback: pick highest quality stream from the list
  if (streams && streams.length > 0) {
    const best = streams.sort((a, b) => {
      const qa = parseInt(a.quality) || 0;
      const qb = parseInt(b.quality) || 0;
      return qb - qa;
    })[0];
    return { url: best.url, type: 'direct' };
  }

  if (hlsUrl) return { url: hlsUrl, type: 'hls' };

  return null;
};

/**
 * Initialise a Plyr instance on the given <video> element.
 * Returns the player instance. Caller must call destroy() on cleanup.
 */
export const initPlayer = (videoElement, options = {}) => {
  const player = new Plyr(videoElement, {
    controls: [
      'play-large',
      'play',
      'progress',
      'current-time',
      'duration',
      'mute',
      'volume',
      'settings',
      'pip',
      'fullscreen',
    ],
    settings: ['speed', 'quality'],
    speed: {
      selected: options.defaultSpeed || 1,
      options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
    },
    keyboard: { focused: true, global: false },
    tooltips: { controls: true, seek: true },
    ratio: '16:9',
    // Prevent autoplay — user intent only
    autoplay: false,
    // Critical for iOS: keeps video inline, prevents forced fullscreen
    playsinline: true,
  });

  return player;
};

/**
 * Set the source on an existing Plyr instance.
 * Handles both HLS and direct URL types.
 */
export const setPlayerSource = (player, videoElement, streamUrl, type) => {
  if (type === 'hls' && !supportsHLSnatively()) {
    // For non-Safari browsers with HLS: would need hls.js
    // For now, fall back to setting src directly and let the browser try
    videoElement.src = streamUrl;
  } else {
    videoElement.src = streamUrl;
  }
  player.play().catch(() => {
    // Autoplay blocked — user must press play manually, which is fine
  });
};

/**
 * Handle visibility change (screen lock, tab switch).
 * Pauses cleanly rather than letting the browser handle it abruptly.
 */
export const attachVisibilityHandler = (player) => {
  const handler = () => {
    if (document.hidden && player && !player.paused) {
      player.pause();
    }
  };
  document.addEventListener('visibilitychange', handler);
  // Returns cleanup function
  return () => document.removeEventListener('visibilitychange', handler);
};

/**
 * Destroy a Plyr instance safely.
 */
export const destroyPlayer = (player) => {
  if (player) {
    try {
      player.destroy();
    } catch {
      // Already destroyed or element removed — safe to ignore
    }
  }
};