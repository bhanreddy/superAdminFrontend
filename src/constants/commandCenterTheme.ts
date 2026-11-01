// NexSyrus Command Centre — Design Tokens & Visual Architecture
// Establishes the high-assurance, enterprise-grade aesthetic for NexSyrus SuperAdmin.

import { Platform } from 'react-native';
import { brandColors, experienceColors } from './experienceColors';

export const COMMAND_CENTER = {
  // Surface Hierarchy
  canvas: experienceColors.dark.canvas, // Deep obsidian midnight base
  canvasSecondary: '#222326',
  surfaceLeft: '#222326',
  surfaceCard: experienceColors.dark.surface,
  surfaceCardElevated: '#303033',
  surfaceInput: '#202123',
  surfaceInputFocused: '#303033',
  surfaceControl: 'rgba(255, 255, 255, 0.04)',
  surfaceControlHover: 'rgba(255, 255, 255, 0.08)',

  // Surface highlights & Highlights
  glassSpecularTop: 'rgba(255, 255, 255, 0.16)',
  glassSpecularSubtle: 'rgba(255, 255, 255, 0.06)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassBorderHover: 'rgba(181, 46, 53, 0.35)',
  glassBorderFocus: brandColors.red,
  glassReflection: 'rgba(255, 255, 255, 0.03)',

  // Crimson accents (legacy key names retained) (Restrained, Precise)
  cobaltPrimary: brandColors.red,
  cobaltHover: brandColors.redBright,
  cobaltPressed: brandColors.redDark,
  cobaltDeep: brandColors.redDark,
  cobaltMuted: 'rgba(181, 46, 53, 0.12)',
  cobaltSubtle: 'rgba(181, 46, 53, 0.06)',
  cobaltGlow: 'rgba(181, 46, 53, 0.28)',
  cobaltFocusRing: 'rgba(181, 46, 53, 0.32)',

  // Secondary Accents & Telemetry
  indigoAccent: brandColors.violetBright,
  cyanAccent: brandColors.blueBright,
  cyanMuted: 'rgba(56, 189, 248, 0.12)',
  cyanGlow: 'rgba(56, 189, 248, 0.25)',

  // High-Assurance Status Semantics
  statusActive: brandColors.blueBright,
  statusActiveGlow: 'rgba(51, 95, 144, 0.35)',
  statusWarning: brandColors.honey,
  statusWarningGlow: 'rgba(255, 214, 10, 0.25)',
  statusWarningBg: 'rgba(255, 214, 10, 0.08)',
  statusWarningBorder: 'rgba(255, 214, 10, 0.25)',
  statusError: brandColors.redBright,
  statusErrorGlow: 'rgba(255, 69, 58, 0.35)',
  statusErrorBg: 'rgba(255, 69, 58, 0.10)',
  statusErrorBorder: 'rgba(255, 69, 58, 0.28)',
  statusInfo: brandColors.blueBright,
  statusInfoBg: 'rgba(181, 46, 53, 0.08)',
  statusInfoBorder: 'rgba(181, 46, 53, 0.22)',

  // Typography Palette
  textPrimary: brandColors.paper,
  textSecondary: experienceColors.dark.muted,
  textTertiary: '#C1B5A9',
  textMuted: '#C1B5A9',
  textCobalt: brandColors.blueBright,

  // CA Mode Distinctive Accent (Amber-Gold Assurance for Financial Audit)
  caAccent: brandColors.blueBright,
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
    system: Platform?.select
      ? Platform.select({
          web: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Segoe UI', Roboto, sans-serif",
          default: undefined,
        })
      : undefined,
    mono: Platform?.select
      ? Platform.select({
          web: "'SF Mono', ui-monospace, Menlo, Monaco, Consolas, monospace",
          ios: 'Menlo',
          android: 'monospace',
          default: 'monospace',
        })
      : 'monospace',
  },

  // Shadows / Liquid Depth
  shadows: {
    cardWeb:
      '0 24px 64px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
    buttonWeb:
      '0 8px 24px -4px rgba(181, 46, 53, 0.42), 0 0 0 1px rgba(255, 255, 255, 0.18) inset',
    glowWeb: '0 0 40px rgba(181, 46, 53, 0.25)',
  },
} as const;

export type CommandCenterTheme = typeof COMMAND_CENTER;
