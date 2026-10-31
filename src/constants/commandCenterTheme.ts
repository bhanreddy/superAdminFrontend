// NexSyrus Command Centre — Design Tokens & Visual Architecture
// Establishes the high-assurance, enterprise-grade aesthetic for NexSyrus SuperAdmin.

import { Platform } from 'react-native';

export const COMMAND_CENTER = {
  // Surface Hierarchy
  canvas: '#060A13', // Deep obsidian midnight base
  canvasSecondary: '#090E1B',
  surfaceLeft: '#080E1C',
  surfaceCard: 'rgba(13, 21, 38, 0.76)',
  surfaceCardElevated: 'rgba(18, 28, 51, 0.88)',
  surfaceInput: 'rgba(11, 18, 33, 0.72)',
  surfaceInputFocused: 'rgba(14, 24, 44, 0.85)',
  surfaceControl: 'rgba(255, 255, 255, 0.04)',
  surfaceControlHover: 'rgba(255, 255, 255, 0.08)',

  // Liquid-Glass Specular & Highlights
  glassSpecularTop: 'rgba(255, 255, 255, 0.16)',
  glassSpecularSubtle: 'rgba(255, 255, 255, 0.06)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassBorderHover: 'rgba(10, 132, 255, 0.35)',
  glassBorderFocus: '#0A84FF',
  glassReflection: 'rgba(255, 255, 255, 0.03)',

  // Cobalt Accents (Restrained, Precise)
  cobaltPrimary: '#0A84FF',
  cobaltHover: '#2997FF',
  cobaltPressed: '#0066CC',
  cobaltDeep: '#1E40AF',
  cobaltMuted: 'rgba(10, 132, 255, 0.12)',
  cobaltSubtle: 'rgba(10, 132, 255, 0.06)',
  cobaltGlow: 'rgba(10, 132, 255, 0.28)',
  cobaltFocusRing: 'rgba(10, 132, 255, 0.32)',

  // Secondary Accents & Telemetry
  indigoAccent: '#5E5CE6',
  cyanAccent: '#38BDF8',
  cyanMuted: 'rgba(56, 189, 248, 0.12)',
  cyanGlow: 'rgba(56, 189, 248, 0.25)',

  // High-Assurance Status Semantics
  statusActive: '#30D158',
  statusActiveGlow: 'rgba(48, 209, 88, 0.35)',
  statusWarning: '#FFD60A',
  statusWarningGlow: 'rgba(255, 214, 10, 0.25)',
  statusWarningBg: 'rgba(255, 214, 10, 0.08)',
  statusWarningBorder: 'rgba(255, 214, 10, 0.25)',
  statusError: '#FF453A',
  statusErrorGlow: 'rgba(255, 69, 58, 0.35)',
  statusErrorBg: 'rgba(255, 69, 58, 0.10)',
  statusErrorBorder: 'rgba(255, 69, 58, 0.28)',
  statusInfo: '#0A84FF',
  statusInfoBg: 'rgba(10, 132, 255, 0.08)',
  statusInfoBorder: 'rgba(10, 132, 255, 0.22)',

  // Typography Palette
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textMuted: '#475569',
  textCobalt: '#38BDF8',

  // CA Mode Distinctive Accent (Amber-Gold Assurance for Financial Audit)
  caAccent: '#38BDF8',
  caPillBg: 'rgba(56, 189, 248, 0.12)',
  caPillBorder: 'rgba(56, 189, 248, 0.3)',

  // Spacing & Border Radii
  radii: {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    pill: 9999,
  },

  // Font Stacks
  fonts: {
    system: Platform?.select ? Platform.select({
      web: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Segoe UI', Roboto, sans-serif",
      default: undefined,
    }) : undefined,
    mono: Platform?.select ? Platform.select({
      web: "'SF Mono', ui-monospace, Menlo, Monaco, Consolas, monospace",
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }) : 'monospace',
  },

  // Shadows / Liquid Depth
  shadows: {
    cardWeb: '0 24px 64px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
    buttonWeb: '0 8px 24px -4px rgba(10, 132, 255, 0.42), 0 0 0 1px rgba(255, 255, 255, 0.18) inset',
    glowWeb: '0 0 40px rgba(10, 132, 255, 0.25)',
  },
} as const;

export type CommandCenterTheme = typeof COMMAND_CENTER;
