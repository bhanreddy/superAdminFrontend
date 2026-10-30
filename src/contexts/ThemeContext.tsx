import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import { Appearance, Platform } from 'react-native';
import { useAccessibilityPreferences } from '../hooks/useAccessibilityPreferences';
import {
  darkTheme,
  lightTheme,
  ThemeColors,
  ClayShadow,
  ClayShadowSet,
} from '../constants/theme';

import {
  getWorkspaceModule,
  workspaceModules,
  WorkspaceModule,
} from '../constants/workspaceDesign';

const THEME_KEY = 'superadmin-theme';

// Synchronous initial theme: saved choice → system preference → dark default.
// Runs before first paint on web so there's no flash of the wrong theme.
function getInitialIsDark(): boolean {
  if (Platform.OS === 'web') {
    try {
      const saved = window.localStorage.getItem(THEME_KEY);
      if (saved === 'light') return false;
      if (saved === 'dark') return true;
      if (window.matchMedia?.('(prefers-color-scheme: light)').matches)
        return false;
    } catch {}
  }
  return Appearance?.getColorScheme?.() !== 'light';
}

// Shared keyboard focus and reduced-motion defaults. No page-wide theme animation.
function ensureTransitionStyles() {
  if (Platform.OS !== 'web') return;
  try {
    if (document.getElementById('workspace-accessibility-style')) return;
    const el = document.createElement('style');
    el.id = 'workspace-accessibility-style';
    el.textContent = `
      @media (pointer: coarse) {
        [role="button"], button { min-height: 44px; min-width: 44px; }
      }
      [tabindex]:focus-visible, a:focus-visible, button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible {
        outline: 3px solid var(--nex-focus, #3155C6) !important; outline-offset: 3px;
      }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: 0s !important; scroll-behavior: auto !important;
        }
      }
      @media (prefers-reduced-transparency: reduce) {
        *, *::before, *::after { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
      }
    `;
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
  reducedMotion: boolean;
  reducedTransparency: boolean;
  workspaceModule: WorkspaceModule;
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
  reducedMotion: false,
  reducedTransparency: false,
  workspaceModule: 'overview',
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
  const preferences = useAccessibilityPreferences();

  useEffect(() => {
    ensureTransitionStyles();
  }, []);

  // Keep the browser's own UI (form controls, scrollbars) in sync with the theme.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try {
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    } catch {}
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      if (Platform.OS === 'web') {
        try {
          window.localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
        } catch {}
      }
      return next;
    });
  }, []);

  const value = useMemo(() => {
    const currentTheme = isDark ? darkTheme : lightTheme;
    return {
      ...preferences,
      workspaceModule: 'overview' as WorkspaceModule,
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
  }, [isDark, toggleTheme, preferences]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** Screen accents are presentation only; permissions and status colours are unchanged. */
export function WorkspaceThemeProvider({
  path,
  children,
}: {
  path: string;
  children: React.ReactNode;
}) {
  const base = useTheme();
  const workspaceModule = getWorkspaceModule(path);
  const value = useMemo(() => {
    const palette = workspaceModules[workspaceModule];
    const primary = base.isDark ? palette.dark : palette.light;
    const tint = base.isDark ? palette.night : palette.tint;
    return {
      ...base,
      workspaceModule,
      colors: {
        ...base.colors,
        primary,
        primaryFill: palette.fill,
        primaryHover: palette.fill,
        primaryDim: tint,
        primaryMuted: tint,
        focusRing: primary,
        headerGradientStart: tint,
        headerGradientEnd: base.colors.card,
        tabBarActive: primary,
      },
    };
  }, [base, workspaceModule]);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try {
      document.documentElement.style.setProperty(
        '--nex-focus',
        value.colors.primary,
      );
    } catch {}
  }, [value.colors.primary]);
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
