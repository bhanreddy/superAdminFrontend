import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';

interface AvatarProps {
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  online?: boolean;
}

const SIZE_MAP = { sm: 30, md: 38, lg: 48 };
const FONT_MAP = { sm: 11, md: 14, lg: 17 };

// Generate consistent color from name
function hashColor(name: string): string {
  const palette = [
    '#818CF8', '#A78BFA', '#F472B6', '#FB7185', '#FB923C',
    '#FBBF24', '#34D399', '#2DD4BF', '#22D3EE', '#60A5FA',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

export const Avatar = React.memo(function Avatar({
  name = '',
  size = 'md',
  online,
}: AvatarProps) {
  const { colors, clayShadows } = useTheme();
  const dim = SIZE_MAP[size];
  const fontSize = FONT_MAP[size];
  const bg = name ? hashColor(name) : colors.textTertiary;

  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  return (
    <View style={[styles.wrap, { width: dim, height: dim }]}>
      <View style={[
        styles.circle,
        { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: bg },
        clayStyle(clayShadows.subtle),
      ]}>
        <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
      </View>
      {online !== undefined && (
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: online ? '#34D399' : colors.textTertiary,
              borderColor: colors.background,
              width: size === 'sm' ? 8 : 10,
              height: size === 'sm' ? 8 : 10,
              borderRadius: size === 'sm' ? 4 : 5,
              borderWidth: size === 'sm' ? 1.5 : 2,
            },
          ]}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
  },
});
