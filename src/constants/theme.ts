// NexSyrus workspace design system. Calm surfaces, purposeful colour and clear type.
// Legacy clay token names remain compatible with existing screens.

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
  primaryFill: string;
  onPrimary: string;
  inputBg: string;
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
  clayHighlight: string; // Inner top-left light reflection
  clayBorderColor: string; // Very subtle semi-transparent border
  clayInnerLight: string; // Inner ambient glow
}

// ─── Font Family ────────────────────────────────────────────────────────────
const fontFamily = Platform.select({
  web: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  default: undefined,
});

// ─── Typography Scale (improved readability) ────────────────────────────────
const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    fontFamily,
  },
  h2: {
    fontSize: 26,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    fontFamily,
  },
  h3: {
    fontSize: 21,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    fontFamily,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
    fontFamily,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    letterSpacing: 0,
    fontFamily,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: 0,
    fontFamily,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0,
    fontFamily,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: 0.1,
    fontFamily,
  },
  overline: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
    fontFamily,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
    fontFamily,
  },
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

// Keep the legacy shadow API, with one restrained external shadow per surface.
function shadow(
  y: number,
  blur: number,
  opacity: number,
  elevation: number,
): ClayShadow {
  return {
    shadowColor: '#142342',
    shadowOffset: { width: 0, height: y },
    shadowOpacity: opacity,
    shadowRadius: blur / 2,
    elevation,
    web: y ? `0 ${y}px ${blur}px rgba(20,35,66,${opacity})` : 'none',
  };
}
function makeClayLightShadows() {
  return {
    none: shadow(0, 0, 0, 0),
    subtle: shadow(1, 3, 0.04, 0),
    clay: shadow(2, 8, 0.04, 1),
    clayElevated: shadow(6, 20, 0.07, 2),
    clayStrong: shadow(12, 36, 0.12, 4),
    clayPanel: shadow(4, 16, 0.05, 1),
    clayInset: shadow(0, 0, 0, 0),
    clayPressed: shadow(0, 0, 0, 0),
    buttonPrimary: shadow(2, 6, 0.1, 1),
    buttonDanger: shadow(2, 6, 0.1, 1),
  };
}
function makeClayDarkShadows() {
  return {
    none: shadow(0, 0, 0, 0),
    subtle: shadow(0, 0, 0, 0),
    clay: shadow(0, 0, 0, 0),
    clayElevated: shadow(4, 14, 0.14, 2),
    clayStrong: shadow(12, 36, 0.24, 4),
    clayPanel: shadow(0, 0, 0, 0),
    clayInset: shadow(0, 0, 0, 0),
    clayPressed: shadow(0, 0, 0, 0),
    buttonPrimary: shadow(0, 0, 0, 0),
    buttonDanger: shadow(0, 0, 0, 0),
  };
}

export type ClayShadowSet = ReturnType<typeof makeClayLightShadows>;

// ─── Legacy shadows (backward compat for old theme references) ──────────────
const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
};

// ─── Animation Durations ────────────────────────────────────────────────────
const animation = {
  fast: 120,
  normal: 180,
  slow: 240,
  spring: { tension: 220, friction: 18 },
  springGentle: { tension: 160, friction: 20 },
};

// ─── Layout Constants ───────────────────────────────────────────────────────
const layout = {
  sidebarWidth: 264,
  sidebarCollapsedWidth: 72,
  topbarHeight: 64,
  maxContentWidth: 99999,
  mobileBreakpoint: 1024,
  tabletBreakpoint: 1024,
};

// ─── Z-Index Scale ──────────────────────────────────────────────────────────
const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  topbar: 30,
  sidebar: 40,
  overlay: 45,
  modal: 50,
  toast: 60,
  tooltip: 70,
};

// ─── Shared Tokens ──────────────────────────────────────────────────────────
const sharedTokens = {
  spacing,
  borderRadius,
  typography,
  shadows,
  animation,
  layout,
  zIndex,
};

// Light and dark workspace palettes.
export const darkTheme = {
  colors: {
    background: '#0D1525',
    surface: '#121E32',
    card: '#17243A',
    elevated: '#1D2D47',
    border: '#34435B',
    borderSubtle: '#26364E',
    primary: '#A8BAFF',
    primaryFill: '#3155C6',
    onPrimary: '#FFFFFF',
    inputBg: '#101C30',
    primaryHover: '#C2CEFF',
    primaryDim: '#24365E',
    primaryMuted: '#1B2848',
    accent: '#CAB0FF',
    textPrimary: '#F1F5FC',
    textSecondary: '#B3C2D9',
    textTertiary: '#A0B0CB',
    textInverse: '#101A2E',
    success: '#7DDCB1',
    successDim: '#16372E',
    warning: '#F4C184',
    warningDim: '#392C20',
    error: '#FFA4AC',
    errorDim: '#432632',
    info: '#95CBF7',
    infoDim: '#1B3045',
    hover: '#21324D',
    active: '#293F60',
    focus: '#32486D',
    focusRing: '#A8BAFF',
    sidebarBg: '#101B30',
    sidebarItemHover: '#1B2C49',
    sidebarItemActive: '#263A61',
    sidebarText: '#E5ECF8',
    sidebarTextMuted: '#A7B9D6',
    sidebarBorder: '#26364E',
    topbarBg: '#121E32',
    topbarBorder: '#26364E',
    overlay: '#06101CCC',
    backdrop: '#06101C99',
    skeleton: '#253650',
    skeletonHighlight: '#344967',
    divider: '#26364E',
    tabBarBackground: '#121E32',
    tabBarGlass: '#121E32',
    tabBarBorder: '#34435B',
    tabBarActive: '#A8BAFF',
    tabBarInactive: '#B3C2D9',
    headerGradientStart: '#17243A',
    headerGradientEnd: '#1B2848',
    glassBackground: '#17243A',
    glassBorder: '#34435B',
    glassLightweight: '#17243A',
    salesNow: '#F4C184',
    salesEvent: '#95CBF7',
    salesUnknown: '#B3C2D9',
    importNew: '#7DDCB1',
    importExact: '#95CBF7',
    importPossible: '#F4C184',
    importConflict: '#FFA4AC',
    importInvalid: '#B3C2D9',
    clayHighlight: '#22334E',
    clayBorderColor: '#34435B',
    clayInnerLight: '#1D2D47',
  } as ThemeColors,
  clayShadows: makeClayDarkShadows(),
  ...sharedTokens,
};

export const lightTheme = {
  colors: {
    background: '#F3F5FA',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    border: '#CAD3E1',
    borderSubtle: '#E1E7F0',
    primary: '#3155C6',
    primaryFill: '#3155C6',
    onPrimary: '#FFFFFF',
    inputBg: '#F9FAFD',
    primaryHover: '#2444A8',
    primaryDim: '#E4EBFF',
    primaryMuted: '#EEF2FF',
    accent: '#7040BB',
    textPrimary: '#182740',
    textSecondary: '#52617A',
    textTertiary: '#61718B',
    textInverse: '#FFFFFF',
    success: '#15704D',
    successDim: '#EAF6EF',
    warning: '#9B5215',
    warningDim: '#FCF2E6',
    error: '#BF3547',
    errorDim: '#FCEEF0',
    info: '#24679E',
    infoDim: '#EDF5FC',
    hover: '#EDF1F8',
    active: '#E3EAF6',
    focus: '#DFE7FF',
    focusRing: '#3155C6',
    sidebarBg: '#12223D',
    sidebarItemHover: '#203653',
    sidebarItemActive: '#2C4165',
    sidebarText: '#E5ECF8',
    sidebarTextMuted: '#A7B9D6',
    sidebarBorder: '#2A3D59',
    topbarBg: '#FFFFFF',
    topbarBorder: '#E1E7F0',
    overlay: '#101B3D80',
    backdrop: '#101B3D66',
    skeleton: '#E1E7F0',
    skeletonHighlight: '#EDF1F8',
    divider: '#E1E7F0',
    tabBarBackground: '#FFFFFF',
    tabBarGlass: '#FFFFFF',
    tabBarBorder: '#E1E7F0',
    tabBarActive: '#3155C6',
    tabBarInactive: '#52617A',
    headerGradientStart: '#EEF2FF',
    headerGradientEnd: '#FFFFFF',
    glassBackground: '#FFFFFF',
    glassBorder: '#E1E7F0',
    glassLightweight: '#F9FAFD',
    salesNow: '#9B5215',
    salesEvent: '#24679E',
    salesUnknown: '#52617A',
    importNew: '#15704D',
    importExact: '#24679E',
    importPossible: '#9B5215',
    importConflict: '#BF3547',
    importInvalid: '#61718B',
    clayHighlight: '#FFFFFF',
    clayBorderColor: '#E1E7F0',
    clayInnerLight: '#F3F5FA',
  } as ThemeColors,
  clayShadows: makeClayLightShadows(),
  ...sharedTokens,
};

// ─── Default export for backward compatibility ──────────────────────────────
export const theme = darkTheme;

export const MEDIA_EDITORIAL = { accent: '#651F34' } as const;
