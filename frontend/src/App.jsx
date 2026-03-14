// ============================================================
// FocusTube — App Root
// Wires all views together. Manages top-level state:
// current view (home/player), search state, panel visibility.
// ============================================================

import { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import SearchBar from './components/SearchBar.jsx';
import ResultsGrid from './components/ResultsGrid.jsx';
import PlayerView from './components/PlayerView.jsx';
import WatchLaterPanel from './components/WatchLaterPanel.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import { useSearch } from './hooks/useSearch.js';
import { usePlayer } from './hooks/usePlayer.js';
import { initInstances } from './modules/instanceManager.js';
import { getWatchLater, getPreferences } from './modules/storage.js';
import { useTheme } from './context/ThemeContext.jsx';
import './styles/global.css';
import './App.css';

export default function App() {
  const { setTheme } = useTheme();

  // Hooks
  const { query, results, loading, error, filter, search, changeFilter, reset } = useSearch();
  const { activeVideo, view, openVideo, closeVideo, goHome } = usePlayer();

  // Panels
  const [wlOpen, setWlOpen]         = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [wlCount, setWlCount]       = useState(0);

  // Init on mount
  useEffect(() => {
    initInstances().catch(() => {});
    const prefs = getPreferences();
    setTheme(prefs.theme || 'warm');
    setWlCount(getWatchLater().length);
  }, []);

  const handleSearch = (q, durationFilter) => {
    goHome();
    search(q, durationFilter);
  };

  const handleLogoClick = () => {
    goHome();
    reset();
  };

  const handleWlOpen = () => {
    setWlCount(getWatchLater().length);
    setWlOpen(true);
  };

  const handleWlPlay = (video) => {
    openVideo(video);
    setWlCount(getWatchLater().length);
  };

  return (
    <div className="app">
      <Header
        onWatchLaterOpen={handleWlOpen}
        onSettingsOpen={() => setSettingsOpen(true)}
        watchLaterCount={wlCount}
        onLogoClick={handleLogoClick}
      />

      <main className="app-main">
        {view === 'home' && (
          <div className="home-layout">
            <div className="search-wrap">
              <SearchBar
                onSearch={handleSearch}
                loading={loading}
                initialQuery={query}
                activeFilter={filter}
                onFilterChange={changeFilter}
              />
            </div>
            <ResultsGrid
              results={results}
              loading={loading}
              error={error}
              query={query}
              onVideoClick={openVideo}
            />
          </div>
        )}

        {view === 'player' && activeVideo && (
          <div className="player-layout">
            {/* Search bar stays accessible above player */}
            <div className="search-wrap search-wrap-player">
              <SearchBar
                onSearch={handleSearch}
                loading={loading}
                initialQuery={query}
                activeFilter={filter}
                onFilterChange={changeFilter}
              />
            </div>
            <PlayerView
              video={activeVideo}
              onBack={closeVideo}
            />
          </div>
        )}
      </main>

      <WatchLaterPanel
        open={wlOpen}
        onClose={() => setWlOpen(false)}
        onPlay={handleWlPlay}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}