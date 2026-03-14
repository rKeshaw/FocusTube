// ============================================================
// FocusTube — SearchBar Component
// Search input with history dropdown and duration filter.
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { getSearchHistory, removeSearchHistory } from '../modules/storage.js';
import { CONFIG } from '../config/constants.js';
import './SearchBar.css';

export default function SearchBar({ onSearch, loading, initialQuery = '', activeFilter, onFilterChange }) {
  const [query, setQuery] = useState(initialQuery);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setHistory(getSearchHistory());
  }, [showHistory]);

  // Close history on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = (q = query) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setShowHistory(false);
    inputRef.current?.blur();
    onSearch(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') setShowHistory(false);
  };

  const handleHistoryClick = (q) => {
    setQuery(q);
    handleSubmit(q);
  };

  const handleRemoveHistory = (e, q) => {
    e.stopPropagation();
    removeSearchHistory(q);
    setHistory(getSearchHistory());
  };

  const filteredHistory = history.filter((h) =>
    query ? h.toLowerCase().includes(query.toLowerCase()) : true
  );

  return (
    <div className="searchbar-root" ref={wrapperRef}>
      <div className="searchbar-input-row">
        <div className={`searchbar-box ${loading ? 'loading' : ''}`}>
          <svg className="searchbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="searchbar-input"
            placeholder="Search for something to watch…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowHistory(true)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck="false"
            aria-label="Search videos"
          />
          {query && (
            <button
              className="searchbar-clear"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <button
          className="searchbar-btn"
          onClick={() => handleSubmit()}
          disabled={loading || !query.trim()}
          aria-label="Search"
        >
          {loading ? <span className="searchbar-spinner" /> : 'Search'}
        </button>
      </div>

      {/* Duration filter pills */}
      <div className="searchbar-filters" role="group" aria-label="Duration filter">
        {Object.entries(CONFIG.DURATION_FILTERS).map(([key, { label }]) => (
          <button
            key={key}
            className={`filter-pill ${activeFilter === key ? 'active' : ''}`}
            onClick={() => onFilterChange(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search history dropdown */}
      {showHistory && filteredHistory.length > 0 && (
        <ul className="searchbar-history" role="listbox">
          {filteredHistory.map((h) => (
            <li
              key={h}
              className="history-item"
              role="option"
              onClick={() => handleHistoryClick(h)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
              </svg>
              <span>{h}</span>
              <button
                className="history-remove"
                onClick={(e) => handleRemoveHistory(e, h)}
                aria-label={`Remove ${h} from history`}
              >✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}