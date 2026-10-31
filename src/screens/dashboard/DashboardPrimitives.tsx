import React from 'react';
import {
  brandColors,
  experienceColors,
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
import type { Resource } from './useDashboardData';

export function useDashboardPalette() {
  const { isDark } = useTheme();
  const palette = isDark ? experienceColors.dark : experienceColors.light;
  return {
    ...palette,
    // Retain the existing chart API while using one interaction accent.
    green: palette.action,
    greenFill: palette.actionFill,
    lime: isDark ? '#D5F080' : '#D5EF8B',
    amber: isDark ? '#F4CD91' : '#8A571A',
    amberBg: isDark ? '#382F22' : '#FCF1DF',
    blue: isDark ? '#A8C8F0' : '#315D91',
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
    <Pressable
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
            ? p.greenFill
            : hovered
            ? p.inset
            : p.surface,
          borderColor: inverse
            ? primary
              ? brandColors.gold
              : '#FFFFFF45'
            : primary
            ? p.greenFill
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
    </Pressable>
  );
}
export function Panel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}) {
  const p = useDashboardPalette();
  return (
    <View
      style={[
        ds.panel,
        { backgroundColor: p.surface, borderColor: p.line },
        style,
      ]}
    >
      {children}
    </View>
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
        <ActivityIndicator color={inverse ? '#D5EF8B' : p.green} />
        <Text style={{ color: inverse ? '#C6D9C5' : p.muted, fontSize: 13 }}>
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Retry ${label}`}
          onPress={() => void resource.reload()}
          style={ds.button}
        >
          <RefreshCw size={15} color={p.green} />
          <Text style={{ color: p.green, fontWeight: '600' }}>Try again</Text>
        </Pressable>
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
  panel: { borderWidth: 1, borderRadius: 22, padding: 24, minWidth: 0 },
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
    borderRadius: 10,
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
