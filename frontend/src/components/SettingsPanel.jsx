// ============================================================
// FocusTube — SettingsPanel Component
// Preferences: active Piped instance, playback defaults,
// storage management. All local — nothing sent to any server.
// ============================================================

import { useState, useEffect } from 'react';
import { getPreferences, setPreference, resetPreferences, clearSearchHistory, clearWatchLater } from '../modules/storage.js';
import { getInstanceList, setManualInstance, clearInstance } from '../modules/instanceManager.js';
import { CONFIG } from '../config/constants.js';
import './SettingsPanel.css';

export default function SettingsPanel({ open, onClose }) {
  const [prefs, setPrefs]           = useState(getPreferences());
  const [activeInst, setActiveInst] = useState(
    () => localStorage.getItem(CONFIG.STORAGE_KEYS.ACTIVE_INSTANCE) || ''
  );
  const [customInst, setCustomInst] = useState('');
  const [clearMsg, setClearMsg]     = useState('');

  useEffect(() => {
    if (open) setPrefs(getPreferences());
  }, [open]);

  const updatePref = (key, value) => {
    setPreference(key, value);
    setPrefs((p) => ({ ...p, [key]: value }));
  };

  const handleInstanceChange = (url) => {
    setManualInstance(url);
    setActiveInst(url);
  };

  const handleCustomInstance = () => {
    const url = customInst.trim().replace(/\/$/, '');
    if (!url.startsWith('http')) return;
    handleInstanceChange(url);
    setCustomInst('');
  };

  const handleResetInstance = () => {
    clearInstance();
    setActiveInst('');
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setClearMsg('Search history cleared.');
    setTimeout(() => setClearMsg(''), 2500);
  };

  const handleClearWatchLater = () => {
    clearWatchLater();
    setClearMsg('Watch Later cleared.');
    setTimeout(() => setClearMsg(''), 2500);
  };

  const handleResetAll = () => {
    resetPreferences();
    clearSearchHistory();
    clearWatchLater();
    clearInstance();
    setPrefs(getPreferences());
    setActiveInst('');
    setClearMsg('All data reset.');
    setTimeout(() => setClearMsg(''), 2500);
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

          {/* Piped Instance */}
          <section className="settings-section">
            <h3>Piped API Instance</h3>
            <p className="settings-desc">
              FocusTube uses Piped to search and stream videos without ads.
              If search is broken, switch to a different instance.
            </p>
            <div className="instance-list">
              {getInstanceList().map((url) => (
                <button
                  key={url}
                  className={`instance-btn ${activeInst === url ? 'active' : ''}`}
                  onClick={() => handleInstanceChange(url)}
                >
                  <span className="instance-dot" />
                  {url.replace('https://', '')}
                  {activeInst === url && <span className="instance-active-badge">active</span>}
                </button>
              ))}
            </div>

            <div className="custom-instance-row">
              <input
                type="text"
                placeholder="https://your-piped-instance.com"
                value={customInst}
                onChange={(e) => setCustomInst(e.target.value)}
                className="custom-instance-input"
                onKeyDown={(e) => e.key === 'Enter' && handleCustomInstance()}
              />
              <button className="custom-instance-btn" onClick={handleCustomInstance}>
                Use
              </button>
            </div>

            {activeInst && (
              <button className="settings-link-btn" onClick={handleResetInstance}>
                Reset to auto-select
              </button>
            )}
          </section>

          {/* Playback */}
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

          {/* Data */}
          <section className="settings-section">
            <h3>Local Data</h3>
            <p className="settings-desc">
              All data is stored only on your device. Nothing is sent to any server.
            </p>
            <div className="settings-actions">
              <button className="settings-danger-btn" onClick={handleClearHistory}>
                Clear search history
              </button>
              <button className="settings-danger-btn" onClick={handleClearWatchLater}>
                Clear Watch Later
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