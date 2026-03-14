// ============================================================
// FocusTube — DownloadsPanel Component
// Shows videos saved to IndexedDB. Play in-app or export to filesystem.
// ============================================================

import { useState, useEffect } from 'react';
import { getDownloads, deleteDownload, clearDownloads } from '../modules/storage.js';
import { createBlobUrl, exportToFilesystem } from '../modules/download.js';
import { formatDuration } from '../modules/filters.js';
import './DownloadsPanel.css';

const formatSize = (bytes) => {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
};

export default function DownloadsPanel({ open, onClose, onPlay }) {
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getDownloads()
      .then(setList)
      .finally(() => setLoading(false));
  }, [open]);

  const handleDelete = async (videoId) => {
    await deleteDownload(videoId);
    setList((l) => l.filter((v) => v.videoId !== videoId));
  };

  const handleClear = async () => {
    await clearDownloads();
    setList([]);
  };

  const handlePlay = (item) => {
    const url = createBlobUrl(item.blob);
    onPlay({ ...item, blobUrl: url });
    onClose();
  };

  const handleExport = (item) => {
    const ext = item.format || 'mp4';
    const filename = `${item.title?.replace(/[^\w\s]/g, '').replace(/\s+/g, '_') || item.videoId}.${ext}`;
    exportToFilesystem(item.blob, filename);
  };

  return (
    <>
      {open && <div className="panel-backdrop" onClick={onClose} />}
      <aside className={`side-panel ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="panel-header">
          <h2>Downloads</h2>
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

        {loading ? (
          <div className="panel-empty">
            <div className="panel-spinner" />
          </div>
        ) : list.length === 0 ? (
          <div className="panel-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            <p>No downloads yet.</p>
            <span>Download a video to watch it offline.</span>
          </div>
        ) : (
          <ul className="panel-list">
            {list.map((item) => (
              <li key={item.videoId} className="panel-item">
                <div className="panel-thumb-wrap" onClick={() => handlePlay(item)}>
                  <img src={item.thumbnail} alt={item.title} loading="lazy" />
                  <span className="panel-duration">{formatDuration(item.duration)}</span>
                  <div className="panel-play-overlay">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5,3 19,12 5,21"/>
                    </svg>
                  </div>
                </div>
                <div className="panel-item-info">
                  <p className="panel-item-title" onClick={() => handlePlay(item)}>{item.title}</p>
                  <span className="panel-item-meta">
                    {item.format?.toUpperCase()} · {formatSize(item.size)}
                  </span>
                </div>
                <div className="panel-item-actions">
                  <button
                    className="panel-icon-btn"
                    onClick={() => handleExport(item)}
                    title="Export to filesystem"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                    </svg>
                  </button>
                  <button
                    className="panel-icon-btn danger"
                    onClick={() => handleDelete(item.videoId)}
                    title="Delete download"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="panel-footer">
          {list.length > 0 && (
            <span>{list.length} download{list.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </aside>
    </>
  );
}