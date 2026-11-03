import { borderRadius } from './layout';
// NexSyrus workspace design system. Calm surfaces, purposeful colour and clear type.
// Legacy clay token names remain compatible with existing screens.

import { Platform } from 'react-native';
import { brandColors, experienceColors } from './experienceColors';

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
export { borderRadius, workspaceUi } from './layout';

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
    shadowColor: brandColors.ink,
    shadowOffset: { width: 0, height: y },
    shadowOpacity: opacity,
    shadowRadius: blur / 2,
    elevation,
    web: y ? `0 ${y}px ${blur}px rgba(25,43,70,${opacity})` : 'none',
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
export const animation = {
  fast: 120,
  normal: 180,
  slow: 240,
  pressIn: 90,
  pressOut: 160,
  entrance: 320,
  stagger: 40,
  pressSpring: { damping: 26, stiffness: 360, mass: 0.7 },
  spring: { tension: 220, friction: 18 },
  springGentle: { tension: 160, friction: 20 },
};

// ─── Layout Constants ───────────────────────────────────────────────────────
const layout = {
  sidebarWidth: 252,
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
    background: experienceColors.dark.canvas,
    surface: '#222326',
    card: experienceColors.dark.surface,
    elevated: '#303033',
    border: '#5A514C',
    borderSubtle: experienceColors.dark.line,
    primary: brandColors.redBright,
    primaryFill: brandColors.red,
    onPrimary: brandColors.white,
    inputBg: '#202123',
    primaryHover: '#F8BCB2',
    primaryDim: brandColors.redNight,
    primaryMuted: brandColors.redNight,
    accent: brandColors.amberBright,
    textPrimary: experienceColors.dark.ink,
    textSecondary: experienceColors.dark.muted,
    textTertiary: '#C1B5A9',
    textInverse: '#1C1D20',
    success: brandColors.blueBright,
    successDim: '#192B46',
    warning: brandColors.amberBright,
    warningDim: '#3C3327',
    error: '#F1A0A3',
    errorDim: '#44262E',
    info: brandColors.blueBright,
    infoDim: '#29394B',
    hover: '#35312F',
    active: '#45332F',
    focus: brandColors.redNight,
    focusRing: brandColors.redBright,
    sidebarBg: '#222326',
    sidebarItemHover: '#34302E',
    sidebarItemActive: brandColors.redNight,
    sidebarText: '#F5EBDD',
    sidebarTextMuted: '#CCC2B8',
    sidebarBorder: '#484440',
    topbarBg: '#222326',
    topbarBorder: '#484440',
    overlay: '#171819BB',
    backdrop: '#17181988',
    skeleton: '#3C3936',
    skeletonHighlight: '#514A43',
    divider: '#484440',
    tabBarBackground: '#222326',
    tabBarGlass: '#222326',
    tabBarBorder: '#484440',
    tabBarActive: brandColors.redBright,
    tabBarInactive: '#CCC2B8',
    headerGradientStart: brandColors.redNight,
    headerGradientEnd: '#27282B',
    glassBackground: '#27282B',
    glassBorder: '#484440',
    glassLightweight: '#2B2928',
    salesNow: brandColors.amberBright,
    salesEvent: brandColors.blueBright,
    salesUnknown: '#CCC2B8',
    importNew: brandColors.blueBright,
    importExact: brandColors.blueBright,
    importPossible: brandColors.amberBright,
    importConflict: '#F1A0A3',
    importInvalid: '#CCC2B8',
    clayHighlight: '#3A3531',
    clayBorderColor: '#484440',
    clayInnerLight: '#303033',
  } as ThemeColors,
  clayShadows: makeClayDarkShadows(),
  ...sharedTokens,
};

export const lightTheme = {
  colors: {
    background: brandColors.paper,
    surface: brandColors.paperDeep,
    card: brandColors.white,
    elevated: brandColors.white,
    border: '#DBD2C9',
    borderSubtle: brandColors.line,
    primary: brandColors.red,
    primaryFill: brandColors.red,
    onPrimary: brandColors.white,
    inputBg: brandColors.paper,
    primaryHover: brandColors.redDark,
    primaryDim: brandColors.roseSoft,
    primaryMuted: brandColors.redSoft,
    accent: brandColors.amber,
    textPrimary: brandColors.ink,
    textSecondary: brandColors.muted,
    textTertiary: '#6C6F76',
    textInverse: brandColors.white,
    success: brandColors.blue,
    successDim: brandColors.blueSoft,
    warning: brandColors.amber,
    warningDim: brandColors.honeySoft,
    error: '#A34850',
    errorDim: brandColors.roseSoft,
    info: brandColors.blue,
    infoDim: brandColors.blueSoft,
    hover: '#F5EFE7',
    active: '#F6E9E6',
    focus: brandColors.redSoft,
    focusRing: brandColors.red,
    sidebarBg: brandColors.paperDeep,
    sidebarItemHover: '#F0E9E1',
    sidebarItemActive: '#F6E9E6',
    sidebarText: brandColors.ink,
    sidebarTextMuted: brandColors.muted,
    sidebarBorder: brandColors.line,
    topbarBg: brandColors.paper,
    topbarBorder: brandColors.line,
    overlay: '#192B4677',
    backdrop: '#192B4655',
    skeleton: '#E9E3DD',
    skeletonHighlight: '#F8F3EC',
    divider: brandColors.line,
    tabBarBackground: brandColors.paper,
    tabBarGlass: brandColors.paper,
    tabBarBorder: brandColors.line,
    tabBarActive: brandColors.red,
    tabBarInactive: brandColors.muted,
    headerGradientStart: brandColors.redSoft,
    headerGradientEnd: brandColors.paper,
    glassBackground: brandColors.white,
    glassBorder: brandColors.line,
    glassLightweight: brandColors.paper,
    salesNow: brandColors.amber,
    salesEvent: brandColors.blue,
    salesUnknown: brandColors.muted,
    importNew: brandColors.blue,
    importExact: brandColors.blue,
    importPossible: brandColors.amber,
    importConflict: brandColors.rose,
    importInvalid: brandColors.muted,
    clayHighlight: brandColors.white,
    clayBorderColor: brandColors.line,
    clayInnerLight: brandColors.paperDeep,
  } as ThemeColors,
  clayShadows: makeClayLightShadows(),
  ...sharedTokens,
};

// ─── Default export for backward compatibility ──────────────────────────────
export const theme = darkTheme;

export const MEDIA_EDITORIAL = { accent: brandColors.redDark } as const;
