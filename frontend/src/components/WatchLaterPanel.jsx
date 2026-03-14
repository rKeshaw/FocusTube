// ============================================================
// FocusTube — WatchLaterPanel Component
// Slide-out panel showing saved videos. Fully local storage.
// ============================================================

import { useState, useEffect } from 'react';
import { getWatchLater, removeWatchLater, clearWatchLater } from '../modules/storage.js';
import { formatDuration } from '../modules/filters.js';
import './WatchLaterPanel.css';

export default function WatchLaterPanel({ open, onClose, onPlay }) {
  const [list, setList] = useState([]);

  useEffect(() => {
    if (open) setList(getWatchLater());
  }, [open]);

  const handleRemove = (e, videoId) => {
    e.stopPropagation();
    removeWatchLater(videoId);
    setList(getWatchLater());
  };

  const handleClear = () => {
    clearWatchLater();
    setList([]);
  };

  return (
    <>
      {/* Backdrop */}
      {open && <div className="wl-backdrop" onClick={onClose} />}

      <aside className={`wl-panel ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="wl-header">
          <h2>Watch Later</h2>
          <div className="wl-header-actions">
            {list.length > 0 && (
              <button className="wl-clear" onClick={handleClear} title="Clear all">
                Clear all
              </button>
            )}
            <button className="wl-close" onClick={onClose} aria-label="Close panel">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="wl-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="m19 21-7-3-7 3V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z"/>
            </svg>
            <p>Nothing saved yet.</p>
            <span>Hover a video and click the bookmark icon.</span>
          </div>
        ) : (
          <ul className="wl-list">
            {list.map((video) => (
              <li
                key={video.videoId}
                className="wl-item"
                onClick={() => { onPlay(video); onClose(); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && (onPlay(video), onClose())}
              >
                <div className="wl-thumb-wrap">
                  <img src={video.thumbnail} alt={video.title} loading="lazy" />
                  <span className="wl-duration">{formatDuration(video.duration)}</span>
                </div>
                <div className="wl-item-info">
                  <p className="wl-item-title">{video.title}</p>
                  <span className="wl-item-uploader">{video.uploaderName}</span>
                </div>
                <button
                  className="wl-remove"
                  onClick={(e) => handleRemove(e, video.videoId)}
                  aria-label="Remove from Watch Later"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="wl-footer">
          {list.length > 0 && <span>{list.length} video{list.length !== 1 ? 's' : ''} saved</span>}
        </div>
      </aside>
    </>
  );
}