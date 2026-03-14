// ============================================================
// FocusTube — Download Module
// Downloads are saved to IndexedDB (in-app) not the OS filesystem.
// Visible in the Downloads panel. Can be played or deleted in-app.
// ============================================================

import { CONFIG } from '../config/constants.js';
import { saveDownload } from './storage.js';

/**
 * Download a video, save it to IndexedDB, report progress via onProgress.
 * onProgress receives { status, percent } objects.
 */
export const downloadVideo = async (video, format = 'mp4', quality = 'best', onProgress) => {
  const base = CONFIG.BACKEND_URL;

  onProgress?.({ status: 'starting', percent: 0 });

  const res = await fetch(`${base}/api/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId: video.videoId, format, quality }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Download failed: ${res.status}`);
  }

  // Stream to blob with progress tracking
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
    } else {
      // No content-length (chunked transfer) — pulse indeterminate progress
      onProgress?.({ status: 'downloading', percent: -1 });
    }
  }

  onProgress?.({ status: 'saving', percent: 100 });

  const mimeType = format === 'mp3' ? 'audio/mpeg'
                 : format === 'webm' ? 'video/webm'
                 : 'video/mp4';

  const blob = new Blob(chunks, { type: mimeType });

  // Save to IndexedDB — persists across sessions
  await saveDownload(video, blob, format, quality);

  return { size: blob.size };
};

/**
 * Create a temporary object URL for a blob and trigger browser playback
 * or export. The caller is responsible for revoking the URL when done.
 */
export const createBlobUrl = (blob) => URL.createObjectURL(blob);

/**
 * Trigger a browser "Save As" export for an already-downloaded blob.
 * Used when the user explicitly wants to export to their filesystem.
 */
export const exportToFilesystem = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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