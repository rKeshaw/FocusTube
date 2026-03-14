// ============================================================
// FocusTube — usePlayer Hook
// Manages the active video state: which video is playing,
// navigation between player and results view.
// ============================================================

import { useState, useCallback } from 'react';

export const usePlayer = () => {
  const [activeVideo, setActiveVideo] = useState(null);
  const [view, setView]               = useState('home'); // 'home' | 'player'

  const openVideo = useCallback((video) => {
    setActiveVideo(video);
    setView('player');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const closeVideo = useCallback(() => {
    setActiveVideo(null);
    setView('home');
  }, []);

  const goHome = useCallback(() => {
    setActiveVideo(null);
    setView('home');
  }, []);

  return {
    activeVideo,
    view,
    openVideo,
    closeVideo,
    goHome,
  };
};