// ============================================================
// FocusTube — React Entry Point
// ============================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './context/ThemeContext.jsx';
import App from './App.jsx';

// Apply saved theme class immediately before first render
// to prevent flash of wrong theme
const savedTheme = (() => {
  try {
    const prefs = JSON.parse(localStorage.getItem('ft_preferences') || '{}');
    return prefs.theme || 'warm';
  } catch {
    return 'warm';
  }
})();

const themeClassMap = {
  warm:  'theme-warm',
  dark:  'theme-dark',
  light: 'theme-light',
  mono:  'theme-mono',
};
document.documentElement.classList.add(themeClassMap[savedTheme] || 'theme-warm');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);