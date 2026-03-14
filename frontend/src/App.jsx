// ============================================================
// FocusTube — App Root
// ============================================================

import { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import SearchBar from './components/SearchBar.jsx';
import ResultsGrid from './components/ResultsGrid.jsx';
import PlayerView from './components/PlayerView.jsx';
import WatchLaterPanel from './components/WatchLaterPanel.jsx';
import WatchHistoryPanel from './components/WatchHistoryPanel.jsx';
import DownloadsPanel from './components/DownloadsPanel.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import { useSearch } from './hooks/useSearch.js';
import { usePlayer } from './hooks/usePlayer.js';
import { getWatchLater, getDownloads, addWatchHistory } from './modules/storage.js';
import { getPreferences } from './modules/storage.js';
import { useTheme } from './context/ThemeContext.jsx';
import './styles/global.css';
import './App.css';

export default function App() {
  const { setTheme } = useTheme();

  const { query, results, loading, error, filter, search, changeFilter, reset } = useSearch();
  const { activeVideo, view, openVideo, closeVideo, goHome } = usePlayer();

  const [wlOpen,       setWlOpen]       = useState(false);
  const [historyOpen,  setHistoryOpen]  = useState(false);
  const [dlOpen,       setDlOpen]       = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [wlCount, setWlCount] = useState(0);
  const [dlCount, setDlCount] = useState(0);

  useEffect(() => {
    const prefs = getPreferences();
    setTheme(prefs.theme || 'warm');
    setWlCount(getWatchLater().length);
    getDownloads().then((list) => setDlCount(list.length)).catch(() => {});

    // Keep the Watch Later badge count in sync whenever any component
    // adds or removes a video — no prop drilling required.
    const syncWlCount = () => setWlCount(getWatchLater().length);
    window.addEventListener('ft:watchlater-changed', syncWlCount);
    return () => window.removeEventListener('ft:watchlater-changed', syncWlCount);
  }, []);

  const handleOpenVideo = (video) => {
    openVideo(video);
    addWatchHistory(video);
  };

  const handleSearch = (q, durationFilter) => {
    goHome();
    search(q, durationFilter);
  };

  const handleLogoClick = () => { goHome(); reset(); };

  const handleWlOpen = () => setWlOpen(true);

  const handleDlOpen = () => {
    getDownloads().then((list) => setDlCount(list.length)).catch(() => {});
    setDlOpen(true);
  };

  const handleDownloadComplete = () => {
    getDownloads().then((list) => setDlCount(list.length)).catch(() => {});
  };

  // Playing a downloaded blob — set src directly on the video element
  // by passing a synthetic video object with a blobUrl property
  const handlePlayDownload = (item) => {
    handleOpenVideo({ ...item, blobUrl: item.blobUrl });
  };

  return (
    <div className="app">
      <Header
        onWatchLaterOpen={handleWlOpen}
        onHistoryOpen={() => setHistoryOpen(true)}
        onDownloadsOpen={handleDlOpen}
        onSettingsOpen={() => setSettingsOpen(true)}
        watchLaterCount={wlCount}
        downloadsCount={dlCount}
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
              onVideoClick={handleOpenVideo}
            />
          </div>
        )}

        {view === 'player' && activeVideo && (
          <div className="player-layout">
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
              onDownloadComplete={handleDownloadComplete}
            />
          </div>
        )}
      </main>

      <WatchLaterPanel
        open={wlOpen}
        onClose={() => setWlOpen(false)}
        onPlay={handleOpenVideo}
      />

      <WatchHistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onPlay={handleOpenVideo}
      />

      <DownloadsPanel
        open={dlOpen}
        onClose={() => setDlOpen(false)}
        onPlay={handlePlayDownload}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}