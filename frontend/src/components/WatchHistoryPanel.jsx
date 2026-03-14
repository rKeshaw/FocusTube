// ============================================================
// FocusTube — WatchHistoryPanel Component
// Shows every video the user has opened, most recent first.
// ============================================================

import { useState, useEffect } from 'react';
import { getWatchHistory, clearWatchHistory } from '../modules/storage.js';
import { formatDuration } from '../modules/filters.js';
import './WatchHistoryPanel.css';

const formatWatchedAt = (ts) => {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1)    return 'Just now';
  if (diffMins < 60)   return `${diffMins}m ago`;
  if (diffHours < 24)  return `${diffHours}h ago`;
  if (diffDays < 7)    return `${diffDays}d ago`;
  return d.toLocaleDateString();
};

export default function WatchHistoryPanel({ open, onClose, onPlay }) {
  const [list, setList] = useState([]);

  useEffect(() => {
    if (open) setList(getWatchHistory());
  }, [open]);

  const handleClear = () => {
    clearWatchHistory();
    setList([]);
  };

  return (
    <>
      {open && <div className="panel-backdrop" onClick={onClose} />}
      <aside className={`side-panel ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="panel-header">
          <h2>Watch History</h2>
          <div className="panel-header-actions">
            {list.length > 0 && (
              <button className="panel-clear-btn" onClick={handleClear}>Clear all</button>
            )}
            <button className="panel-close-btn" onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="panel-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
            </svg>
            <p>No watch history yet.</p>
            <span>Videos you open will appear here.</span>
          </div>
        ) : (
          <ul className="panel-list">
            {list.map((video) => (
              <li
                key={video.videoId + video.watchedAt}
                className="panel-item"
                onClick={() => { onPlay(video); onClose(); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && (onPlay(video), onClose())}
              >
                <div className="panel-thumb-wrap">
                  <img src={video.thumbnail} alt={video.title} loading="lazy" />
                  <span className="panel-duration">{formatDuration(video.duration)}</span>
                </div>
                <div className="panel-item-info">
                  <p className="panel-item-title">{video.title}</p>
                  <span className="panel-item-uploader">{video.uploaderName}</span>
                  <span className="panel-item-meta">{formatWatchedAt(video.watchedAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="panel-footer">
          {list.length > 0 && (
            <span>{list.length} video{list.length !== 1 ? 's' : ''} watched</span>
          )}
        </div>
      </aside>
    </>
  );
}