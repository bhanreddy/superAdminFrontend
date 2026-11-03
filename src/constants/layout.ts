/** Platform-independent geometry shared by native and web workspace screens. */
export const borderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 32,
  full: 9999,
};

/** Shared workspace geometry for every role and feature page. */
export const workspaceUi = {
  pageGutter: 24,
  phoneGutter: 16,
  sectionGap: 20,
  cardPadding: 16,
  cardRadius: borderRadius.lg,
  controlRadius: borderRadius.md,
  chipRadius: borderRadius.sm,
  pageTitle: { fontSize: 28, lineHeight: 36, fontWeight: '600' as const, letterSpacing: -0.6 },
  phoneTitle: { fontSize: 24, lineHeight: 32 },
  sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const, letterSpacing: -0.4 },
  body: { fontSize: 14, lineHeight: 22 },
  caption: { fontSize: 12, lineHeight: 18 },
} as const;
