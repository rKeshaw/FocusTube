// ============================================================
// FocusTube — VideoCard Component
// Displays a single search result. Long-press for quick actions.
// ============================================================

import { useState, useRef } from 'react';
import { formatDuration, formatViewCount } from '../modules/filters.js';
import { isInWatchLater, addWatchLater, removeWatchLater } from '../modules/storage.js';
import './VideoCard.css';

export default function VideoCard({ video, onClick, style }) {
  const [inWL, setInWL] = useState(() => isInWatchLater(video.videoId));
  const [showActions, setShowActions] = useState(false);
  const longPressTimer = useRef(null);

  const toggleWatchLater = (e) => {
    e.stopPropagation();
    if (inWL) {
      removeWatchLater(video.videoId);
      setInWL(false);
    } else {
      addWatchLater(video);
      setInWL(true);
    }
  };

  // Long press for mobile quick actions
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => setShowActions(true), 500);
  };
  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  return (
    <article
      className="video-card animate-fade-up"
      style={style}
      onClick={() => onClick(video)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseLeave={() => setShowActions(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(video)}
      aria-label={video.title}
    >
      {/* Thumbnail */}
      <div className="card-thumb-wrap">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="card-thumb"
          loading="lazy"
        />
        <span className="card-duration">{formatDuration(video.duration)}</span>

        {/* Watch Later hover button */}
        <button
          className={`card-wl-btn ${inWL ? 'active' : ''}`}
          onClick={toggleWatchLater}
          aria-label={inWL ? 'Remove from Watch Later' : 'Save to Watch Later'}
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
        </button>
      </div>

      {/* Info */}
      <div className="card-info">
        <h3 className="card-title">{video.title}</h3>
        <div className="card-meta">
          <span className="card-uploader">{video.uploaderName}</span>
          {video.viewCount > 0 && (
            <span className="card-views">{formatViewCount(video.viewCount)} views</span>
          )}
          {video.uploadedDate && (
            <span className="card-date">{video.uploadedDate}</span>
          )}
        </div>
      </div>

      {/* Mobile long-press action sheet */}
      {showActions && (
        <div className="card-actions" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { onClick(video); setShowActions(false); }}>▶ Watch</button>
          <button onClick={(e) => { toggleWatchLater(e); setShowActions(false); }}>
            {inWL ? '✕ Remove from Watch Later' : '+ Watch Later'}
          </button>
          <button onClick={() => setShowActions(false)}>Cancel</button>
        </div>
      )}
    </article>
  );
}