import { MotionPressable } from '../../components/ui/MotionPressable';
import React from 'react';
import {
  brandColors,
  experienceColors,
  type CardTone,
} from '../../constants/experienceColors';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { ArrowUpRight, RefreshCw, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { borderRadius } from '../../constants/theme';
import type { Resource } from './useDashboardData';

export function useDashboardPalette() {
  const { isDark, colors } = useTheme();
  const palette = isDark ? experienceColors.dark : experienceColors.light;
  return {
    ...palette,
    canvas: colors?.background || palette.canvas,
    surface: colors?.card || palette.surface,
    inset: colors?.primaryMuted || palette.inset,
    ink: colors?.textPrimary || palette.ink,
    muted: colors?.textSecondary || palette.muted,
    line: colors?.borderSubtle || palette.line,
    highlight: brandColors.honey,
    amber: isDark ? brandColors.amberBright : brandColors.amber,
    amberBg: isDark ? '#3C3327' : brandColors.honeySoft,
    blue: isDark ? brandColors.blueBright : brandColors.blue,
  };
}
export type DashboardPalette = ReturnType<typeof useDashboardPalette>;
export function DashButton({
  label,
  onPress,
  primary = false,
  inverse = false,
  icon = true,
  disabled = false,
  busy = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  inverse?: boolean;
  icon?: boolean;
  disabled?: boolean;
  busy?: boolean;
}) {
  const p = useDashboardPalette();
  const foreground = inverse
    ? primary
      ? brandColors.goldInk
      : '#FFFFFF'
    : primary
    ? '#FFFFFF'
    : p.ink;
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      aria-busy={busy}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed, hovered }: any) => [
        ds.button,
        {
          backgroundColor: inverse
            ? primary
              ? brandColors.gold
              : hovered
              ? '#FFFFFF25'
              : '#FFFFFF12'
            : primary
            ? p.actionFill
            : hovered
            ? p.inset
            : p.surface,
          borderColor: inverse
            ? primary
              ? brandColors.gold
              : '#FFFFFF45'
            : primary
            ? p.actionFill
            : p.line,
          opacity: disabled || busy ? 0.55 : pressed ? 0.75 : 1,
        },
      ]}
    >
      {busy ? <ActivityIndicator size="small" color={foreground} /> : null}
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: foreground,
        }}
      >
        {label}
      </Text>
      {icon && !busy ? <ArrowUpRight size={16} color={foreground} /> : null}
    </MotionPressable>
  );
}
export function Panel({
  children,
  style,
  tone,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  tone?: CardTone;
}) {
  const p = useDashboardPalette();
  return (
    <Card
      noPadding
      tone={tone}
      material="panel"
      style={[
        ds.panel,
        { backgroundColor: p.surface, borderColor: p.line },
        style,
      ]}
    >
      {children}
    </Card>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  const p = useDashboardPalette();
  return (
    <View style={ds.headingRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {eyebrow ? (
          <Text style={[ds.eyebrow, { color: p.muted }]}>{eyebrow}</Text>
        ) : null}
        <Text
          accessibilityRole="header"
          style={[ds.sectionTitle, { color: p.ink }]}
        >
          {title}
        </Text>
      </View>
      {action}
    </View>
  );
}
export function ResourceStatus({
  resource,
  label,
  children,
  inverse = false,
}: {
  resource: Pick<Resource<unknown>, 'error' | 'loading' | 'data' | 'reload'>;
  label: string;
  children: React.ReactNode;
  inverse?: boolean;
}) {
  const p = useDashboardPalette();
  if (resource.loading && resource.data == null)
    return (
      <View
        accessibilityLabel={`Loading ${label}`}
        accessibilityState={{ busy: true }}
        aria-busy={true}
        style={ds.state}
      >
        <View style={{ width: '100%', gap: 14 }} accessible={false}>
          <Skeleton width="42%" height={14} />
          <Skeleton width="72%" height={34} />
          <Skeleton width="92%" height={12} />
        </View>
        <Text
          style={{
            color: inverse ? brandColors.onNavyMuted : p.muted,
            fontSize: 13,
          }}
        >
          Loading {label}…
        </Text>
      </View>
    );
  if (resource.error)
    return (
      <View
        accessibilityRole="alert"
        style={[ds.state, { backgroundColor: p.amberBg, borderRadius: 14 }]}
      >
        <AlertCircle size={21} color={p.amber} />
        <Text style={{ color: p.ink, fontSize: 14, fontWeight: '600' }}>
          {label} is unavailable
        </Text>
        <Text style={[ds.body, { color: p.muted, textAlign: 'center' }]}>
          Check your connection and try again.
        </Text>
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel={`Retry ${label}`}
          onPress={() => void resource.reload()}
          style={ds.button}
        >
          <RefreshCw size={15} color={p.action} />
          <Text style={{ color: p.action, fontWeight: '600' }}>Try again</Text>
        </MotionPressable>
      </View>
    );
  return <>{children}</>;
}
export function EmptyNote({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  const p = useDashboardPalette();
  return (
    <View style={ds.state}>
      <Text
        style={{
          color: p.ink,
          fontSize: 16,
          fontWeight: '600',
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      <Text
        style={[
          ds.body,
          { color: p.muted, textAlign: 'center', maxWidth: 330 },
        ]}
      >
        {detail}
      </Text>
    </View>
  );
}
export const ds = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: 24,
    minWidth: 0,
  },
  headingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 21, fontWeight: '600', letterSpacing: -0.6 },
  body: { fontSize: 13, lineHeight: 21 },
  button: {
    minHeight: 44,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  state: {
    minHeight: 168,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
});
