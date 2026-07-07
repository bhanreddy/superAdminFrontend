import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { Platform } from 'react-native';
import { darkTheme, lightTheme, ThemeColors, ClayShadow, ClayShadowSet } from '../constants/theme';

const THEME_KEY = 'superadmin-theme';

// Synchronous initial theme: saved choice → system preference → dark default.
// Runs before first paint on web so there's no flash of the wrong theme.
function getInitialIsDark(): boolean {
  if (Platform.OS === 'web') {
    try {
      const saved = window.localStorage.getItem(THEME_KEY);
      if (saved === 'light') return false;
      if (saved === 'dark') return true;
      if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return false;
    } catch {}
  }
  return true;
}

// Injects, once, the CSS that animates every surface during a theme switch.
// The rule only bites while <html> carries `theme-transition`, so hover/press
// interactions stay instant the rest of the time.
function ensureTransitionStyles() {
  if (Platform.OS !== 'web') return;
  try {
    if (document.getElementById('theme-transition-style')) return;
    const el = document.createElement('style');
    el.id = 'theme-transition-style';
    el.textContent =
      'html.theme-transition, html.theme-transition * , html.theme-transition *::before, html.theme-transition *::after' +
      '{transition: background-color .45s cubic-bezier(.4,0,.2,1), background-image .45s cubic-bezier(.4,0,.2,1),' +
      ' border-color .45s cubic-bezier(.4,0,.2,1), color .35s cubic-bezier(.4,0,.2,1),' +
      ' box-shadow .45s cubic-bezier(.4,0,.2,1), fill .35s ease, stroke .35s ease !important;}';
    document.head.appendChild(el);
  } catch {}
}

// ─── Clay Shadow Platform Helper ────────────────────────────────────────────
// Returns the correct shadow style object per platform
export function clayStyle(shadow: ClayShadow): any {
  if (Platform.OS === 'web') {
    return { boxShadow: shadow.web };
  }
  return {
    shadowColor: shadow.shadowColor,
    shadowOffset: shadow.shadowOffset,
    shadowOpacity: shadow.shadowOpacity,
    shadowRadius: shadow.shadowRadius,
    elevation: shadow.elevation,
  };
}

interface ThemeContextValue {
  isDark: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
  spacing: typeof darkTheme.spacing;
  borderRadius: typeof darkTheme.borderRadius;
  typography: typeof darkTheme.typography;
  shadows: typeof darkTheme.shadows;
  clayShadows: ClayShadowSet;
  animation: typeof darkTheme.animation;
  layout: typeof darkTheme.layout;
  zIndex: typeof darkTheme.zIndex;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: true,
  toggleTheme: () => {},
  colors: darkTheme.colors,
  spacing: darkTheme.spacing,
  borderRadius: darkTheme.borderRadius,
  typography: darkTheme.typography,
  shadows: darkTheme.shadows,
  clayShadows: darkTheme.clayShadows,
  animation: darkTheme.animation,
  layout: darkTheme.layout,
  zIndex: darkTheme.zIndex,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(getInitialIsDark);

  useEffect(() => { ensureTransitionStyles(); }, []);

  // Keep the browser's own UI (form controls, scrollbars) in sync with the theme.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try { document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'; } catch {}
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    if (Platform.OS === 'web') {
      try {
        const root = document.documentElement;
        root.classList.add('theme-transition');
        window.setTimeout(() => root.classList.remove('theme-transition'), 520);
      } catch {}
    }
    setIsDark((prev) => {
      const next = !prev;
      if (Platform.OS === 'web') {
        try { window.localStorage.setItem(THEME_KEY, next ? 'dark' : 'light'); } catch {}
      }
      return next;
    });
  }, []);

  const value = useMemo(() => {
    const currentTheme = isDark ? darkTheme : lightTheme;
    return {
      isDark,
      toggleTheme,
      colors: currentTheme.colors,
      spacing: currentTheme.spacing,
      borderRadius: currentTheme.borderRadius,
      typography: currentTheme.typography,
      shadows: currentTheme.shadows,
      clayShadows: currentTheme.clayShadows,
      animation: currentTheme.animation,
      layout: currentTheme.layout,
      zIndex: currentTheme.zIndex,
    };
  }, [isDark, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
