import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { MetricValue } from './MetricValue';
import { useTheme } from '../../contexts/ThemeContext';
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: { value: string; direction: 'up' | 'down' };
  accentColor?: string;
  onPress?: () => void;
}
export const StatCard = React.memo(function StatCard({
  title,
  value,
  icon,
  trend,
  accentColor,
  onPress,
}: StatCardProps) {
  const { colors } = useTheme();
  const accent = accentColor || colors.primary;
  const content = (
    <>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: `${accent}16` }]}>
          {icon}
        </View>
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
        style={[styles.value, { color: colors.textPrimary }]}
        value={
          typeof value === 'number' ? value.toLocaleString('en-IN') : value
        }
      />
      <Text style={[styles.title, { color: colors.textSecondary }]}>
        {title}
      </Text>
    </>
  );
  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.card,
      borderColor: colors.borderSubtle || colors.border,
      borderTopColor: accent,
    },
  ];
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${value}`}
      onPress={onPress}
      style={({ hovered, pressed }: any) => [
        ...cardStyle,
        hovered && { backgroundColor: colors.primaryMuted },
        pressed && { opacity: 0.86 },
        Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
      ]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={cardStyle}>{content}</View>
  );
});
const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderTopWidth: 3,
    padding: 20,
    minHeight: 154,
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
    width: 42,
    height: 42,
    borderRadius: 12,
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
  title: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
});
