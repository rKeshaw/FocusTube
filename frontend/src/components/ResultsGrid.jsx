// ============================================================
// FocusTube — ResultsGrid Component
// Displays search results as a responsive card grid.
// Handles loading skeletons, empty states, and errors.
// ============================================================

import VideoCard from './VideoCard.jsx';
import './ResultsGrid.css';

const SkeletonCard = ({ index }) => (
  <div className="skeleton-card" style={{ animationDelay: `${index * 0.06}s` }}>
    <div className="skeleton skeleton-thumb" />
    <div className="skeleton-info">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-title short" />
      <div className="skeleton skeleton-meta" />
    </div>
  </div>
);

export default function ResultsGrid({ results, loading, error, query, onVideoClick }) {
  if (error) {
    return (
      <div className="results-state">
        <div className="results-state-icon">⚠</div>
        <h3>Something went wrong</h3>
        <p>{error}</p>
        <p className="results-state-hint">
          The Piped API may be temporarily unavailable. Try again in a moment.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="results-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} index={i} />
        ))}
      </div>
    );
  }

  if (!query) {
    return (
      <div className="results-state results-state-home">
        <div className="home-hero">
          <svg viewBox="0 0 64 64" fill="none" className="home-icon">
            <rect width="64" height="64" rx="16" fill="var(--accent-soft)"/>
            <polygon points="26,20 26,44 46,32" fill="var(--accent)"/>
          </svg>
          <h2>Watch with intention.</h2>
          <p>No recommendations. No autoplay. No distractions.<br/>Just search for what you want to watch.</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="results-state">
        <div className="results-state-icon">🔍</div>
        <h3>No results found</h3>
        <p>Try a different search or adjust the duration filter.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="results-count">
        {results.length} result{results.length !== 1 ? 's' : ''} for <strong>"{query}"</strong>
      </p>
      <div className="results-grid stagger">
        {results.map((video, i) => (
          <VideoCard
            key={video.videoId}
            video={video}
            onClick={onVideoClick}
            style={{ animationDelay: `${i * 0.04}s` }}
          />
        ))}
      </div>
    </div>
  );
}