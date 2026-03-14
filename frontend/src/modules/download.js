// ============================================================
// FocusTube — Download Module
// All download API calls to the backend.
// If the backend URL changes or a new download provider is used:
// change this file only.
// ============================================================

import { CONFIG } from '../config/constants.js';

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

/**
 * Trigger a video/audio download.
 * On iOS: opens stream in new tab for native player + share sheet.
 * On all others: triggers browser download dialog.
 */
export const downloadVideo = async (videoId, format = 'mp4', quality = 'best', onProgress) => {
  const base = CONFIG.BACKEND_URL;

  if (isIOS()) {
    // iOS Safari: request the stream URL and open it natively
    const res = await fetch(`${base}/api/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, format, quality, iosMode: true }),
    });

    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const { iosStreamUrl, filename } = await res.json();
    window.open(`${base}${iosStreamUrl}`, '_blank');
    return { filename };
  }

  // Desktop / Android: stream directly to file download
  onProgress?.({ status: 'starting', percent: 0 });

  const res = await fetch(`${base}/api/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId, format, quality }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Download failed: ${res.status}`);
  }

  // Extract filename from Content-Disposition header
  const disposition = res.headers.get('Content-Disposition') || '';
  const nameMatch = disposition.match(/filename="?([^"]+)"?/);
  const filename = nameMatch?.[1] || `focustube_${videoId}.${format}`;

  // Stream to blob — allows progress tracking
  const contentLength = res.headers.get('Content-Length');
  const total = contentLength ? parseInt(contentLength) : null;
  let loaded = 0;

  const reader = res.body.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (total) {
      onProgress?.({ status: 'downloading', percent: Math.round((loaded / total) * 100) });
    }
  }

  onProgress?.({ status: 'saving', percent: 100 });

  const blob = new Blob(chunks, {
    type: format === 'mp3' ? 'audio/mpeg' : 'video/mp4',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { filename };
};

/**
 * Fetch available formats/qualities for a video from backend.
 */
export const getVideoInfo = async (videoId) => {
  const res = await fetch(`${CONFIG.BACKEND_URL}/api/info/${videoId}`);
  if (!res.ok) throw new Error('Could not fetch video info');
  const data = await res.json();
  return data.data;
};

/**
 * Check if the backend is reachable.
 */
export const checkBackendHealth = async () => {
  try {
    const res = await fetch(`${CONFIG.BACKEND_URL}/api/health`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
};