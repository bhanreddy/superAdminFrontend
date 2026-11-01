import { MotionPressable } from './MotionPressable';
import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react-native';
import { MetricValue } from './MetricValue';
import { useTheme } from '../../contexts/ThemeContext';
import { Card } from './Card';
import { borderRadius } from '../../constants/theme';
import {
  brandColors,
  getCardTone,
  type CardTone,
} from '../../constants/experienceColors';
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: { value: string; direction: 'up' | 'down' };
  accentColor?: string;
  onPress?: () => void;
  description?: string;
  tone?: CardTone;
}
export const StatCard = React.memo(function StatCard({
  title,
  value,
  icon,
  trend,
  accentColor,
  onPress,
  description,
  tone,
}: StatCardProps) {
  const { colors, isDark } = useTheme();
  const inferredTone: CardTone =
    accentColor === brandColors.blue || accentColor === brandColors.blueBright
      ? 'blue'
      : accentColor === brandColors.amber ||
        accentColor === brandColors.amberBright
      ? 'honey'
      : accentColor === brandColors.violet ||
        accentColor === brandColors.violetBright
      ? 'lavender'
      : accentColor === brandColors.rose
      ? 'rose'
      : 'crimson';
  const resolvedTone = tone || inferredTone;
  const paint = getCardTone(resolvedTone, isDark);
  const accent = paint.accent;
  const content = (
    <>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: `${accent}14` }]}>
          {icon}
        </View>
        {!trend && onPress ? <ArrowUpRight size={18} color={accent} /> : null}
        {trend && (
          <View
            style={[
              styles.trend,
              {
                backgroundColor:
                  trend.direction === 'up'
                    ? colors.successDim
                    : colors.errorDim,
              },
            ]}
          >
            {trend.direction === 'up' ? (
              <TrendingUp size={13} color={colors.success} />
            ) : (
              <TrendingDown size={13} color={colors.error} />
            )}
            <Text
              style={{
                color: trend.direction === 'up' ? colors.success : colors.error,
                fontSize: 12,
                fontWeight: '600',
              }}
            >
              {trend.value}
            </Text>
          </View>
        )}
      </View>
      <MetricValue
        style={[styles.value, { color: paint.ink }]}
        value={
          typeof value === 'number' ? value.toLocaleString('en-IN') : value
        }
      />
      <Text style={[styles.title, { color: paint.muted }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: paint.muted }]}>
          {description}
        </Text>
      ) : null}
    </>
  );
  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.card,
      borderColor: colors.borderSubtle || colors.border,
    },
  ];
  return (
    <Card
      noPadding
      tone={resolvedTone}
      onPress={onPress}
      accessibilityLabel={`${title}: ${value}`}
      style={cardStyle}
    >
      {content}
    </Card>
  );
});
const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: 22,
    minHeight: 190,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  value: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  description: { fontSize: 12, lineHeight: 18, marginTop: 6 },
  title: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
});
