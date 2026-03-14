// ============================================================
// FocusTube — Player Module
// ALL player logic isolated here. PlayerView.jsx is UI only.
// To swap Plyr for another player: change this file only.
// ============================================================

import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

/**
 * Initialise a Plyr instance on the given <video> element.
 * Returns the player instance. Caller must call destroy() on cleanup.
 */
export const initPlayer = (videoElement, options = {}) => {
  const player = new Plyr(videoElement, {
    controls: [
      'play-large',
      'play',
      'rewind',
      'fast-forward',
      'progress',
      'current-time',
      'duration',
      'mute',
      'volume',
      'captions',
      'settings',
      'loop',
      'pip',
      'airplay',
      'fullscreen',
    ],
    settings: ['captions', 'quality', 'speed', 'loop'],
    speed: {
      selected: options.defaultSpeed || 1,
      options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
    },
    keyboard: { focused: true, global: false },
    tooltips: { controls: true, seek: true },
    ratio: '16:9',
    autoplay: false,
    playsinline: true,
    storage: { enabled: true, key: 'ft_plyr' },
    seekTime: 10,
    volume: 1,
  });

  return player;
};

/**
 * Set the source on an existing Plyr instance.
 * streamUrl is always a backend proxy URL — plain HTTP, range-capable.
 */
export const setPlayerSource = (player, videoElement, streamUrl) => {
  videoElement.src = streamUrl;
  player.play().catch(() => {});
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