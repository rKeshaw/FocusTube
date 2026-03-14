// ============================================================
// FocusTube — useSearch Hook
// Encapsulates all search state and logic for use in components.
// Components call this hook — they never import search.js directly.
// ============================================================

import { useState, useCallback } from 'react';
import { searchVideos } from '../modules/search.js';
import { addSearchHistory } from '../modules/storage.js';

export const useSearch = () => {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [filter, setFilter]   = useState('all');

  const search = useCallback(async (q, durationFilter) => {
    const activeFilter = durationFilter ?? filter;
    const trimmed = q?.trim();
    if (!trimmed) return;

    setQuery(trimmed);
    setLoading(true);
    setError(null);

    addSearchHistory(trimmed);

    try {
      const videos = await searchVideos(trimmed, activeFilter);
      setResults(videos);
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const changeFilter = useCallback((newFilter) => {
    setFilter(newFilter);
    if (query) search(query, newFilter);
  }, [query, search]);

  const reset = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
    setFilter('all');
  }, []);

  return {
    query,
    results,
    loading,
    error,
    filter,
    search,
    changeFilter,
    reset,
  };
};