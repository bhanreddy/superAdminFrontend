import React from 'react';
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
  return isDark
    ? {
        canvas: '#111B1A',
        surface: '#182523',
        inset: '#20312D',
        ink: '#EFF5EF',
        muted: '#B1C4BA',
        line: '#334640',
        green: '#93DCC0',
        greenFill: '#21654E',
        lime: '#D5F080',
        amber: '#F4CD91',
        amberBg: '#382F22',
        blue: '#A8C8F0',
        hero: '#143E32',
        heroText: '#F4F8EA',
      }
    : {
        canvas: '#F4F5EF',
        surface: '#FFFFFF',
        inset: '#F0F3EC',
        ink: '#172D27',
        muted: '#5B6D63',
        line: '#DDE4DA',
        green: '#25634D',
        greenFill: '#25634D',
        lime: '#D5EF8B',
        amber: '#8A571A',
        amberBg: '#FCF1DF',
        blue: '#315D91',
        hero: '#173C30',
        heroText: '#F4F8EA',
      };
}
export type DashboardPalette = ReturnType<typeof useDashboardPalette>;
export function DashButton({
  label,
  onPress,
  primary = false,
  icon = true,
  disabled = false,
  busy = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  icon?: boolean;
  disabled?: boolean;
  busy?: boolean;
}) {
  const p = useDashboardPalette();
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
          backgroundColor: primary
            ? p.greenFill
            : hovered
              ? p.inset
              : p.surface,
          borderColor: primary ? p.greenFill : p.line,
          opacity: disabled || busy ? 0.55 : pressed ? 0.75 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={primary ? '#FFFFFF' : p.green} />
      ) : null}
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: primary ? '#FFFFFF' : p.ink,
        }}
      >
        {label}
      </Text>
      {icon && !busy ? (
        <ArrowUpRight size={16} color={primary ? '#FFFFFF' : p.green} />
      ) : null}
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
