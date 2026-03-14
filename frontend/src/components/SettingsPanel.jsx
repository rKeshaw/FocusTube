// ============================================================
// FocusTube — SettingsPanel Component
// ============================================================

import { useState, useEffect } from 'react';
import {
  getPreferences, setPreference, resetPreferences,
  clearSearchHistory, clearWatchLater, clearWatchHistory, clearDownloads,
} from '../modules/storage.js';
import { CONFIG } from '../config/constants.js';
import './SettingsPanel.css';

export default function SettingsPanel({ open, onClose }) {
  const [prefs,    setPrefs]    = useState(getPreferences());
  const [clearMsg, setClearMsg] = useState('');

  useEffect(() => {
    if (open) setPrefs(getPreferences());
  }, [open]);

  const updatePref = (key, value) => {
    setPreference(key, value);
    setPrefs((p) => ({ ...p, [key]: value }));
  };

  const msg = (text) => {
    setClearMsg(text);
    setTimeout(() => setClearMsg(''), 2500);
  };

  const handleClearHistory    = () => { clearSearchHistory(); msg('Search history cleared.'); };
  const handleClearWatchLater = () => { clearWatchLater();    msg('Watch Later cleared.'); };
  const handleClearWatchHistory = () => { clearWatchHistory(); msg('Watch history cleared.'); };
  const handleClearDownloads  = async () => { await clearDownloads(); msg('Downloads cleared.'); };

  const handleResetAll = async () => {
    resetPreferences();
    clearSearchHistory();
    clearWatchLater();
    clearWatchHistory();
    await clearDownloads();
    setPrefs(getPreferences());
    msg('All data reset.');
  };

  return (
    <>
      {open && <div className="settings-backdrop" onClick={onClose} />}
      <aside className={`settings-panel ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose} aria-label="Close settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="settings-body">
          <section className="settings-section">
            <h3>Playback</h3>
            <div className="settings-row">
              <label>Default speed</label>
              <select
                value={prefs.playbackSpeed}
                onChange={(e) => updatePref('playbackSpeed', parseFloat(e.target.value))}
                className="settings-select"
              >
                {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => (
                  <option key={s} value={s}>{s}×</option>
                ))}
              </select>
            </div>
            <div className="settings-row">
              <label>Default duration filter</label>
              <select
                value={prefs.defaultFilter}
                onChange={(e) => updatePref('defaultFilter', e.target.value)}
                className="settings-select"
              >
                {Object.entries(CONFIG.DURATION_FILTERS).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </section>

          <section className="settings-section">
            <h3>Local Data</h3>
            <p className="settings-desc">
              All data is stored only on your device. Nothing is sent to any server.
            </p>
            <div className="settings-actions">
              <button className="settings-danger-btn" onClick={handleClearHistory}>
                Clear search history
              </button>
              <button className="settings-danger-btn" onClick={handleClearWatchHistory}>
                Clear watch history
              </button>
              <button className="settings-danger-btn" onClick={handleClearWatchLater}>
                Clear Watch Later
              </button>
              <button className="settings-danger-btn" onClick={handleClearDownloads}>
                Clear downloads
              </button>
              <button className="settings-danger-btn danger" onClick={handleResetAll}>
                Reset everything
              </button>
            </div>
            {clearMsg && <p className="settings-clear-msg">{clearMsg}</p>}
          </section>
        </div>
      </aside>
    </>
  );
}