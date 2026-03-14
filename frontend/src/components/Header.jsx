// ============================================================
// FocusTube — Header Component
// ============================================================

import { useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import './Header.css';

export default function Header({
  onWatchLaterOpen, onHistoryOpen, onDownloadsOpen,
  onSettingsOpen, watchLaterCount, downloadsCount, onLogoClick
}) {
  const { theme, setTheme, themes } = useTheme();
  const [showThemes, setShowThemes] = useState(false);

  return (
    <header className="header">
      <button className="header-logo" onClick={onLogoClick} aria-label="FocusTube home">
        <div className="logo-mark">
          <svg viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="var(--accent)"/>
            <polygon points="13,10 13,22 23,16" fill="white"/>
          </svg>
        </div>
        <span className="logo-text">FocusTube</span>
      </button>

      <nav className="header-nav">
        {/* Watch History */}
        <button className="header-btn" onClick={onHistoryOpen} title="Watch History">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
          </svg>
          <span className="header-btn-label">History</span>
        </button>

        {/* Downloads */}
        <button className="header-btn" onClick={onDownloadsOpen} title="Downloads">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          <span className="header-btn-label">Downloads</span>
          {downloadsCount > 0 && (
            <span className="header-badge">{downloadsCount > 99 ? '99+' : downloadsCount}</span>
          )}
        </button>

        {/* Watch Later */}
        <button className="header-btn" onClick={onWatchLaterOpen} title="Watch Later">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="m19 21-7-3-7 3V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z"/>
          </svg>
          <span className="header-btn-label">Watch Later</span>
          {watchLaterCount > 0 && (
            <span className="header-badge">{watchLaterCount > 99 ? '99+' : watchLaterCount}</span>
          )}
        </button>

        {/* Theme switcher */}
        <div className="theme-wrap">
          <button className="header-btn" onClick={() => setShowThemes((v) => !v)} title="Switch theme">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
            </svg>
            <span className="header-btn-label">Theme</span>
          </button>

          {showThemes && (
            <>
              <div className="theme-backdrop" onClick={() => setShowThemes(false)} />
              <div className="theme-menu">
                {Object.entries(themes).map(([key, { label }]) => (
                  <button
                    key={key}
                    className={`theme-option ${theme === key ? 'active' : ''}`}
                    onClick={() => { setTheme(key); setShowThemes(false); }}
                  >
                    <span className={`theme-swatch theme-swatch-${key}`} />
                    {label}
                    {theme === key && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="theme-check">
                        <path d="M20 6 9 17l-5-5"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Settings */}
        <button className="header-btn" onClick={onSettingsOpen} title="Settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span className="header-btn-label">Settings</span>
        </button>
      </nav>
    </header>
  );
}