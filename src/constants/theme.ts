// ─── SuperAdmin Design System — Claymorphism Theme Tokens ───────────────────
// Soft tactile surfaces with dual-directional shadows, warm tinted palettes,
// large radii, and breathable spacing. Prefer tokens over hex in UI.

import { Platform } from 'react-native';

// ─── Color Tokens Interface ─────────────────────────────────────────────────
export interface ThemeColors {
  // Surface hierarchy
  background: string;
  surface: string;
  card: string;
  elevated: string;
  border: string;
  borderSubtle: string;

  // Primary palette
  primary: string;
  primaryHover: string;
  primaryDim: string;
  primaryMuted: string;

  // Accent
  accent: string;

  // Text hierarchy
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Semantic
  success: string;
  successDim: string;
  warning: string;
  warningDim: string;
  error: string;
  errorDim: string;
  info: string;
  infoDim: string;

  // Interactive states
  hover: string;
  active: string;
  focus: string;
  focusRing: string;

  // Layout-specific
  sidebarBg: string;
  sidebarItemHover: string;
  sidebarItemActive: string;
  sidebarText: string;
  sidebarTextMuted: string;
  sidebarBorder: string;

  topbarBg: string;
  topbarBorder: string;

  // Overlay & backdrop
  overlay: string;
  backdrop: string;

  // Misc
  skeleton: string;
  skeletonHighlight: string;
  divider: string;

  // Legacy compat
  tabBarBackground: string;
  tabBarGlass: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
  headerGradientStart: string;
  headerGradientEnd: string;
  glassBackground: string;
  glassBorder: string;
  glassLightweight: string;
  salesNow: string;
  salesEvent: string;
  salesUnknown: string;
  importNew: string;
  importExact: string;
  importPossible: string;
  importConflict: string;
  importInvalid: string;

  // ─── Claymorphism-specific tokens ──────────────────────────────────────────
  clayHighlight: string;      // Inner top-left light reflection
  clayBorderColor: string;    // Very subtle semi-transparent border
  clayInnerLight: string;     // Inner ambient glow
}

// ─── Font Family ────────────────────────────────────────────────────────────
const fontFamily = Platform.select({
  web: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  default: undefined,
});

// ─── Typography Scale (improved readability) ────────────────────────────────
const typography = {
  h1: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5, fontFamily },
  h2: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.3, fontFamily },
  h3: { fontSize: 21, fontWeight: '600' as const, letterSpacing: -0.2, fontFamily },
  h4: { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.1, fontFamily },
  subtitle: { fontSize: 16, fontWeight: '500' as const, letterSpacing: 0, fontFamily },
  body: { fontSize: 15, fontWeight: '400' as const, letterSpacing: 0, fontFamily },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, letterSpacing: 0, fontFamily },
  caption: { fontSize: 13, fontWeight: '400' as const, letterSpacing: 0.1, fontFamily },
  overline: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.8, fontFamily },
  label: { fontSize: 14, fontWeight: '500' as const, letterSpacing: 0.1, fontFamily },
};

// ─── Spacing Scale (breathable) ─────────────────────────────────────────────
const spacing = {
  xxs: 2,
  xs: 4,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 56,
  '6xl': 72,
};

// ─── Border Radius (large & smooth for clay) ────────────────────────────────
const borderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 32,
  full: 9999,
};

// ─── Claymorphism Shadow Helpers ────────────────────────────────────────────
// Each shadow set contains both native RN props and a web boxShadow string.
// Components pick the right one per platform.

export interface ClayShadow {
  // React Native shadow props
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
  // Web CSS box-shadow (used via Platform.select)
  web: string;
}

function makeClayLightShadows() {
  return {
    none: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0, web: 'none' } as ClayShadow,
    subtle: {
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
      web: 'inset 1.5px 1.5px 3px rgba(255,255,255,0.95), 0px 4px 16px rgba(0,0,0,0.02)',
    } as ClayShadow,
    clay: {
      shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 3,
      web: 'inset 1.5px 1.5px 3px rgba(255,255,255,0.95), inset -1.5px -1.5px 3px rgba(0,0,0,0.04), 0px 8px 24px rgba(0,0,0,0.04), 0px 1px 2px rgba(0,0,0,0.02)',
    } as ClayShadow,
    clayElevated: {
      shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.07, shadowRadius: 24, elevation: 5,
      web: 'inset 1.5px 1.5px 3px rgba(255,255,255,0.98), inset -2px -2px 4px rgba(0,0,0,0.05), 0px 16px 36px rgba(0,0,0,0.05), 0px 2px 4px rgba(0,0,0,0.02)',
    } as ClayShadow,
    clayStrong: {
      shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.09, shadowRadius: 32, elevation: 8,
      web: 'inset 1.5px 1.5px 4px rgba(255,255,255,0.98), 12px 24px 56px rgba(0,0,0,0.07), -6px -6px 24px rgba(255,255,255,0.9)',
    } as ClayShadow,
    // Framed content panel — soft, wide, gentle. The "sheet of clay" the app sits on.
    clayPanel: {
      shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 28, elevation: 6,
      web: 'inset 1px 1px 2px rgba(255,255,255,0.9), inset -1px -1px 2px rgba(0,0,0,0.025), 0px 18px 48px rgba(0,0,0,0.06), 0px 2px 8px rgba(0,0,0,0.03)',
    } as ClayShadow,
    clayInset: {
      shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0,
      web: 'inset 2px 2px 6px rgba(0,0,0,0.04), inset -2px -2px 6px rgba(255,255,255,0.8)',
    } as ClayShadow,
    clayPressed: {
      shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0,
      web: 'inset 3px 3px 8px rgba(0,0,0,0.06), inset -3px -3px 8px rgba(255,255,255,0.6)',
    } as ClayShadow,
    buttonPrimary: {
      shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4,
      web: 'inset 1px 1px 3px rgba(255,255,255,0.3), 0px 4px 14px rgba(0, 122, 255, 0.2)',
    } as ClayShadow,
    buttonDanger: {
      shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4,
      web: 'inset 1px 1px 3px rgba(255,255,255,0.3), 0px 4px 14px rgba(255, 59, 48, 0.2)',
    } as ClayShadow,
  };
}

function makeClayDarkShadows() {
  return {
    none: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0, web: 'none' } as ClayShadow,
    subtle: {
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 2,
      web: 'inset 1px 1px 1px rgba(255,255,255,0.08), 0px 4px 16px rgba(0,0,0,0.25)',
    } as ClayShadow,
    clay: {
      shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 4,
      web: 'inset 1.5px 1.5px 3px rgba(255,255,255,0.12), inset -1.5px -1.5px 3px rgba(0,0,0,0.35), 0px 8px 32px rgba(0,0,0,0.45)',
    } as ClayShadow,
    clayElevated: {
      shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 24, elevation: 5,
      web: 'inset 1.5px 1.5px 3px rgba(255,255,255,0.15), inset -2px -2px 4px rgba(0,0,0,0.4), 0px 16px 48px rgba(0,0,0,0.5)',
    } as ClayShadow,
    clayStrong: {
      shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.5, shadowRadius: 32, elevation: 8,
      web: 'inset 1.5px 1.5px 4px rgba(255,255,255,0.18), inset -3px -3px 6px rgba(0,0,0,0.45), 0px 24px 64px rgba(0,0,0,0.6)',
    } as ClayShadow,
    // Framed content panel — soft, wide, gentle. The "sheet of clay" the app sits on.
    clayPanel: {
      shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 28, elevation: 6,
      web: 'inset 1px 1px 2px rgba(255,255,255,0.06), inset -1px -1px 2px rgba(0,0,0,0.4), 0px 18px 56px rgba(0,0,0,0.5), 0px 2px 8px rgba(0,0,0,0.3)',
    } as ClayShadow,
    clayInset: {
      shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0,
      web: 'inset 2px 2px 6px rgba(0,0,0,0.3), inset -2px -2px 6px rgba(255,255,255,0.02)',
    } as ClayShadow,
    clayPressed: {
      shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0,
      web: 'inset 3px 3px 8px rgba(0,0,0,0.5), inset -3px -3px 8px rgba(255,255,255,0.03)',
    } as ClayShadow,
    buttonPrimary: {
      shadowColor: '#0A84FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4,
      web: 'inset 1px 1px 3px rgba(255,255,255,0.15), 0px 4px 16px rgba(10, 132, 255, 0.25)',
    } as ClayShadow,
    buttonDanger: {
      shadowColor: '#FF453A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4,
      web: 'inset 1px 1px 3px rgba(255,255,255,0.15), 0px 4px 16px rgba(255, 69, 58, 0.25)',
    } as ClayShadow,
  };
}

export type ClayShadowSet = ReturnType<typeof makeClayLightShadows>;

// ─── Legacy shadows (backward compat for old theme references) ──────────────
const shadows = {
  none: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 5 },
  xl: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 24, elevation: 8 },
};

// ─── Animation Durations ────────────────────────────────────────────────────
const animation = {
  fast: 120,
  normal: 220,
  slow: 350,
  spring: { tension: 220, friction: 18 },
  springGentle: { tension: 160, friction: 20 },
};

// ─── Layout Constants ───────────────────────────────────────────────────────
const layout = {
  sidebarWidth: 260,
  sidebarCollapsedWidth: 72,
  topbarHeight: 64,
  maxContentWidth: 99999,
  mobileBreakpoint: 768,
  tabletBreakpoint: 1024,
};

// ─── Z-Index Scale ──────────────────────────────────────────────────────────
const zIndex = {
  base: 0, dropdown: 10, sticky: 20, topbar: 30, sidebar: 40, overlay: 45, modal: 50, toast: 60, tooltip: 70,
};

// ─── Shared Tokens ──────────────────────────────────────────────────────────
const sharedTokens = { spacing, borderRadius, typography, shadows, animation, layout, zIndex };

// ─── Dark Theme — Apple Graphite ─────────────────────────────────────────────
export const darkTheme = {
  colors: {
    background: '#0A0A0E',
    surface: '#121216',
    card: '#181822',
    elevated: '#22222E',
    border: 'rgba(255,255,255,0.05)',
    borderSubtle: 'rgba(255,255,255,0.02)',

    primary: '#0A84FF',
    primaryHover: '#409CFF',
    primaryDim: 'rgba(10, 132, 255, 0.15)',
    primaryMuted: 'rgba(10, 132, 255, 0.08)',

    accent: '#5E5CE6',

    textPrimary: '#F5F5F7',
    textSecondary: '#86868B',
    textTertiary: '#636366',
    textInverse: '#000000',

    success: '#30D158',
    successDim: 'rgba(48, 209, 88, 0.12)',
    warning: '#FFD60A',
    warningDim: 'rgba(255, 214, 10, 0.12)',
    error: '#FF453A',
    errorDim: 'rgba(255, 69, 58, 0.12)',
    info: '#64D2FF',
    infoDim: 'rgba(100, 210, 255, 0.12)',

    hover: 'rgba(255, 255, 255, 0.04)',
    active: 'rgba(255, 255, 255, 0.08)',
    focus: 'rgba(10, 132, 255, 0.25)',
    focusRing: 'rgba(10, 132, 255, 0.5)',

    sidebarBg: '#07070A',
    sidebarItemHover: 'rgba(255, 255, 255, 0.04)',
    sidebarItemActive: 'rgba(255, 255, 255, 0.08)',
    sidebarText: '#F5F5F7',
    sidebarTextMuted: '#86868B',
    sidebarBorder: 'rgba(255,255,255,0.04)',

    topbarBg: 'rgba(10, 10, 14, 0.65)',
    topbarBorder: 'rgba(255,255,255,0.05)',

    overlay: 'rgba(0, 0, 0, 0.8)',
    backdrop: 'rgba(0, 0, 0, 0.4)',

    skeleton: '#2C2C2E',
    skeletonHighlight: '#3A3A3C',
    divider: 'rgba(255,255,255,0.05)',

    tabBarBackground: '#0A0A0E',
    tabBarGlass: 'rgba(10, 10, 14, 0.85)',
    tabBarBorder: 'rgba(255,255,255,0.08)',
    tabBarActive: '#F5F5F7',
    tabBarInactive: '#86868B',
    headerGradientStart: '#0A0A0E',
    headerGradientEnd: '#121216',
    glassBackground: 'rgba(255, 255, 255, 0.04)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
    glassLightweight: 'rgba(255, 255, 255, 0.06)',
    salesNow: '#FFD60A',
    salesEvent: '#64D2FF',
    salesUnknown: '#98989D',
    importNew: '#30D158',
    importExact: '#64D2FF',
    importPossible: '#FFD60A',
    importConflict: '#FF453A',
    importInvalid: '#98989D',

    clayHighlight: 'rgba(255, 255, 255, 0.08)',
    clayBorderColor: 'rgba(255, 255, 255, 0.06)',
    clayInnerLight: 'rgba(255, 255, 255, 0.04)',
  } as ThemeColors,
  clayShadows: makeClayDarkShadows(),
  ...sharedTokens,
};

// ─── Light Theme — Apple Pearl ───────────────────────────────────────────────
export const lightTheme = {
  colors: {
    background: '#F5F5F7',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    border: 'rgba(0,0,0,0.08)',
    borderSubtle: 'rgba(0,0,0,0.04)',

    primary: '#007AFF',
    primaryHover: '#0056B3',
    primaryDim: 'rgba(0, 122, 255, 0.12)',
    primaryMuted: 'rgba(0, 122, 255, 0.06)',

    accent: '#5856D6',

    textPrimary: '#1D1D1F',
    textSecondary: '#86868B',
    textTertiary: '#A1A1A6',
    textInverse: '#FFFFFF',

    success: '#34C759',
    successDim: 'rgba(52, 199, 89, 0.1)',
    warning: '#FFCC00',
    warningDim: 'rgba(255, 204, 0, 0.1)',
    error: '#FF3B30',
    errorDim: 'rgba(255, 59, 48, 0.1)',
    info: '#32ADE6',
    infoDim: 'rgba(50, 173, 230, 0.1)',

    hover: 'rgba(0, 0, 0, 0.04)',
    active: 'rgba(0, 0, 0, 0.08)',
    focus: 'rgba(0, 122, 255, 0.2)',
    focusRing: 'rgba(0, 122, 255, 0.4)',

    sidebarBg: '#F5F5F7',
    sidebarItemHover: 'rgba(0, 0, 0, 0.05)',
    sidebarItemActive: 'rgba(0, 0, 0, 0.08)',
    sidebarText: '#1D1D1F',
    sidebarTextMuted: '#86868B',
    sidebarBorder: 'rgba(0,0,0,0.06)',

    topbarBg: 'rgba(255, 255, 255, 0.8)',
    topbarBorder: 'rgba(0,0,0,0.08)',

    overlay: 'rgba(0, 0, 0, 0.5)',
    backdrop: 'rgba(255, 255, 255, 0.4)',

    skeleton: '#E5E5EA',
    skeletonHighlight: '#F2F2F7',
    divider: 'rgba(0,0,0,0.08)',

    tabBarBackground: '#FFFFFF',
    tabBarGlass: 'rgba(255, 255, 255, 0.9)',
    tabBarBorder: 'rgba(0,0,0,0.08)',
    tabBarActive: '#1D1D1F',
    tabBarInactive: '#86868B',
    headerGradientStart: '#FFFFFF',
    headerGradientEnd: '#F5F5F7',
    glassBackground: 'rgba(0, 0, 0, 0.02)',
    glassBorder: 'rgba(0, 0, 0, 0.06)',
    glassLightweight: 'rgba(255, 255, 255, 0.72)',
    salesNow: '#8A5A00',
    salesEvent: '#004A99',
    salesUnknown: '#3A3A3C',
    importNew: '#248A3D',
    importExact: '#0071E3',
    importPossible: '#B25000',
    importConflict: '#D70015',
    importInvalid: '#6E6E73',

    clayHighlight: 'rgba(255, 255, 255, 0.9)',
    clayBorderColor: 'rgba(0, 0, 0, 0.04)',
    clayInnerLight: 'rgba(255, 255, 255, 0.8)',
  } as ThemeColors,
  clayShadows: makeClayLightShadows(),
  ...sharedTokens,
};

// ─── Default export for backward compatibility ──────────────────────────────
export const theme = darkTheme;
