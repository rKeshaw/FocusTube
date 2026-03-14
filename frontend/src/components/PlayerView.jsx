// ============================================================
// FocusTube — PlayerView Component
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { getVideoStreams } from '../modules/search.js';
import { initPlayer, setPlayerSource, destroyPlayer } from '../modules/player.js';
import { addWatchLater, isInWatchLater, removeWatchLater } from '../modules/storage.js';
import { downloadVideo } from '../modules/download.js';
import { formatDuration } from '../modules/filters.js';
import './PlayerView.css';

export default function PlayerView({ video, onBack, onDownloadComplete }) {
  const videoRef = useRef(null);
  const plyrRef  = useRef(null);

  const [streams,          setStreams]          = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);
  const [inWL,             setInWL]             = useState(() => isInWatchLater(video.videoId));
  const [downloadState,    setDownloadState]    = useState({ status: 'idle', percent: 0 });
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [selectedFormat,   setSelectedFormat]   = useState('mp4');
  const [selectedQuality,  setSelectedQuality]  = useState('best');

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const streamData = await getVideoStreams(video.videoId, selectedQuality);
        if (!cancelled) setStreams(streamData);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, [video.videoId]);

  useEffect(() => {
    if (!streams?.streamUrl || !videoRef.current) return;
    destroyPlayer(plyrRef.current);
    const player = initPlayer(videoRef.current);
    plyrRef.current = player;
    setPlayerSource(player, videoRef.current, streams.streamUrl);
    return () => destroyPlayer(plyrRef.current);
  }, [streams]);

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
      // Pass full video object so storage can save metadata alongside the blob
      await downloadVideo(video, selectedFormat, selectedQuality, (p) => {
        setDownloadState(p);
      });
      setDownloadState({ status: 'done', percent: 100 });
      onDownloadComplete?.();
      setTimeout(() => setDownloadState({ status: 'idle', percent: 0 }), 3000);
    } catch (err) {
      setDownloadState({ status: 'error', message: err.message });
      setTimeout(() => setDownloadState({ status: 'idle', percent: 0 }), 4000);
    }
  };

  if (loading) return (
    <div className="player-loading">
      <div className="player-spinner" />
      <p>Loading stream…</p>
    </div>
  );

  if (error) return (
    <div className="player-error">
      <p>⚠ {error}</p>
      <button onClick={onBack}>← Back to results</button>
    </div>
  );

  const downloadLabel = {
    idle:        'Download',
    starting:    'Starting…',
    downloading: downloadState.percent >= 0 ? `${downloadState.percent}%` : 'Downloading…',
    saving:      'Saving…',
    done:        '✓ Saved',
    error:       '⚠ Failed',
  }[downloadState.status];

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

          <div className="download-wrap">
            <button
              className={`player-action-btn ${downloadState.status !== 'idle' ? 'active' : ''}`}
              onClick={() => setShowDownloadMenu((v) => !v)}
              disabled={downloadState.status === 'downloading' || downloadState.status === 'starting'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              {downloadLabel}
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
                  Save to Downloads
                </button>
              </div>
            )}

            {downloadState.status === 'downloading' && (
              <div className="download-progress">
                <div
                  className={`download-progress-bar ${downloadState.percent < 0 ? 'indeterminate' : ''}`}
                  style={{ width: downloadState.percent >= 0 ? `${downloadState.percent}%` : '100%' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}