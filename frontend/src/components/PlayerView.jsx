// ============================================================
// FocusTube — PlayerView Component
// Ad-free video player using native HTML5 + Plyr.
// Falls back to a sandboxed YouTube iframe if no stream is available.
// No related videos. No autoplay. Clean exit back to results.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { getVideoStreams } from '../modules/search.js';
import {
  initPlayer,
  setPlayerSource,
  resolveStreamUrl,
  attachVisibilityHandler,
  destroyPlayer,
} from '../modules/player.js';
import { addWatchLater, isInWatchLater, removeWatchLater } from '../modules/storage.js';
import { downloadVideo, checkBackendHealth } from '../modules/download.js';
import { formatDuration } from '../modules/filters.js';
import './PlayerView.css';

export default function PlayerView({ video, onBack }) {
  const videoRef = useRef(null);
  const plyrRef  = useRef(null);

  const [streams,            setStreams]            = useState(null);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState(null);
  const [usingEmbed,         setUsingEmbed]         = useState(false);
  const [inWL,               setInWL]               = useState(() => isInWatchLater(video.videoId));
  const [backendAvailable,   setBackendAvailable]   = useState(false);
  const [downloadState,      setDownloadState]      = useState({ status: 'idle', percent: 0 });
  const [showDownloadMenu,   setShowDownloadMenu]   = useState(false);
  const [selectedFormat,     setSelectedFormat]     = useState('mp4');
  const [selectedQuality,    setSelectedQuality]    = useState('best');

  // Fetch streams and check backend on mount
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setLoading(true);
      setError(null);
      setUsingEmbed(false);

      const [streamData, healthy] = await Promise.all([
        getVideoStreams(video.videoId),
        checkBackendHealth(),
      ]);

      if (cancelled) return;

      setBackendAvailable(healthy);

      if (streamData.embedFallback) {
        setUsingEmbed(true);
        setStreams(streamData);
        setLoading(false);
        return;
      }

      setStreams(streamData);
      setLoading(false);
    };

    init();
    return () => { cancelled = true; };
  }, [video.videoId]);

  // Initialise Plyr once streams are ready (skip if using embed)
  useEffect(() => {
    if (!streams || usingEmbed || !videoRef.current) return;

    const resolved = resolveStreamUrl(streams);
    if (!resolved) {
      // No playable URL despite non-embed response — switch to embed
      setUsingEmbed(true);
      return;
    }

    destroyPlayer(plyrRef.current);
    const player = initPlayer(videoRef.current);
    plyrRef.current = player;
    setPlayerSource(player, videoRef.current, resolved.url, resolved.type);
    const cleanupVisibility = attachVisibilityHandler(player);

    return () => {
      cleanupVisibility();
      destroyPlayer(plyrRef.current);
    };
  }, [streams, usingEmbed]);

  // Escape key exits player
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onBack(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onBack]);

  const toggleWatchLater = () => {
    if (inWL) { removeWatchLater(video.videoId); setInWL(false); }
    else       { addWatchLater(video);            setInWL(true);  }
  };

  const handleDownload = async () => {
    if (downloadState.status === 'downloading') return;
    setShowDownloadMenu(false);
    setDownloadState({ status: 'starting', percent: 0 });
    try {
      await downloadVideo(video.videoId, selectedFormat, selectedQuality, (p) => {
        setDownloadState(p);
      });
      setDownloadState({ status: 'done', percent: 100 });
      setTimeout(() => setDownloadState({ status: 'idle', percent: 0 }), 3000);
    } catch (err) {
      setDownloadState({ status: 'error', message: err.message });
      setTimeout(() => setDownloadState({ status: 'idle', percent: 0 }), 4000);
    }
  };

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="player-loading">
        <div className="player-spinner" />
        <p>Loading stream…</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="player-error">
        <p>⚠ {error}</p>
        <button onClick={onBack}>← Back to results</button>
      </div>
    );
  }

  // ── Shared action buttons (used in both render paths) ────────
  const actionButtons = (
    <div className="player-actions">
      <button
        className={`player-action-btn ${inWL ? 'active' : ''}`}
        onClick={toggleWatchLater}
        title={inWL ? 'Remove from Watch Later' : 'Save to Watch Later'}
      >
        {inWL ? (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 3a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2H5Z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m19 21-7-3-7 3V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z"/>
          </svg>
        )}
        {inWL ? 'Saved' : 'Watch Later'}
      </button>

      {backendAvailable && (
        <div className="download-wrap">
          <button
            className={`player-action-btn download-btn ${downloadState.status !== 'idle' ? 'active' : ''}`}
            onClick={() => setShowDownloadMenu((v) => !v)}
            disabled={downloadState.status === 'downloading' || downloadState.status === 'starting'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            {downloadState.status === 'idle'       && 'Download'}
            {downloadState.status === 'starting'   && 'Starting…'}
            {downloadState.status === 'downloading'&& `${downloadState.percent}%`}
            {downloadState.status === 'saving'     && 'Saving…'}
            {downloadState.status === 'done'       && '✓ Saved'}
            {downloadState.status === 'error'      && '⚠ Failed'}
          </button>

          {showDownloadMenu && (
            <div className="download-menu">
              <div className="download-menu-row">
                <label>Format</label>
                <select value={selectedFormat} onChange={(e) => setSelectedFormat(e.target.value)}>
                  <option value="mp4">MP4 (video)</option>
                  <option value="mp3">MP3 (audio only)</option>
                  <option value="webm">WebM</option>
                </select>
              </div>
              <div className="download-menu-row">
                <label>Quality</label>
                <select value={selectedQuality} onChange={(e) => setSelectedQuality(e.target.value)}>
                  <option value="best">Best available</option>
                  <option value="1080p">1080p</option>
                  <option value="720p">720p</option>
                  <option value="480p">480p</option>
                  <option value="360p">360p</option>
                </select>
              </div>
              <button className="download-start-btn" onClick={handleDownload}>
                Download now
              </button>
            </div>
          )}

          {downloadState.status === 'downloading' && (
            <div className="download-progress">
              <div className="download-progress-bar" style={{ width: `${downloadState.percent}%` }} />
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Embed fallback (YouTube iframe) ──────────────────────────
  if (usingEmbed) {
    return (
      <div className="player-root animate-fade-up">
        <button className="player-back" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back to results
        </button>

        <div className="player-video-wrap">
          <iframe
            className="player-embed"
            src={`https://www.youtube-nocookie.com/embed/${video.videoId}?rel=0&modestbranding=1&playsinline=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>

        <div className="player-embed-notice">
          Streaming via YouTube embed — no custom stream available for this video.
        </div>

        <div className="player-info">
          <div className="player-info-main">
            <h1 className="player-title">{video.title}</h1>
            <div className="player-meta">
              <span>{video.uploaderName}</span>
              {video.duration > 0 && <span>{formatDuration(video.duration)}</span>}
            </div>
          </div>
          {actionButtons}
        </div>
      </div>
    );
  }

  // ── Native Plyr player ───────────────────────────────────────
  return (
    <div className="player-root animate-fade-up">
      <button className="player-back" onClick={onBack}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Back to results
      </button>

      <div className="player-video-wrap">
        <video ref={videoRef} playsInline className="player-video" />
      </div>

      <div className="player-info">
        <div className="player-info-main">
          <h1 className="player-title">{streams?.title || video.title}</h1>
          <div className="player-meta">
            <span>{streams?.uploader || video.uploaderName}</span>
            {streams?.duration > 0 && <span>{formatDuration(streams.duration)}</span>}
          </div>
        </div>
        {actionButtons}
      </div>
    </div>
  );
}