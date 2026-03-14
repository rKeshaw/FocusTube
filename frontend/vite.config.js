// ============================================================
// FocusTube — Vite Configuration
// ============================================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    // Proxy API calls to the backend during development
    // so you don't need to deal with CORS in dev mode
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split vendor chunks for better caching
        manualChunks: {
          react:  ['react', 'react-dom'],
          player: ['plyr'],
        },
      },
    },
  },
});