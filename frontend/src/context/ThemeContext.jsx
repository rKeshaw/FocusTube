// ============================================================
// FocusTube — Theme Context
// Global theme state. Applies theme class to <html> element.
// ============================================================

import { createContext, useContext, useState, useEffect } from 'react';
import { CONFIG } from '../config/constants.js';
import { getPreferences, setPreference } from '../modules/storage.js';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => getPreferences().theme || 'warm');

  const applyTheme = (t) => {
    const html = document.documentElement;
    // Remove all theme classes
    Object.values(CONFIG.THEMES).forEach(({ class: cls }) => html.classList.remove(cls));
    // Add new theme class
    html.classList.add(CONFIG.THEMES[t]?.class || 'theme-warm');
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (t) => {
    setThemeState(t);
    setPreference('theme', t);
    applyTheme(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: CONFIG.THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};