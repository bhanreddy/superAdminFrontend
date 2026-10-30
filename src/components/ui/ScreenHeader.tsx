import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Override default tertiary subtitle color for better contrast on dense screens. */
  subtitleColor?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  showThemeToggle?: boolean;
}

export const ScreenHeader = React.memo(function ScreenHeader({
  title,
  subtitle,
  subtitleColor,
  showBack = false,
  rightAction,
}: ScreenHeaderProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { width: winW } = useWindowDimensions();
  const compact = winW < 420;
  const stackActions = winW < 520;

  return (
    <View
      style={[
        styles.container,
        compact && styles.containerCompact,
        stackActions && styles.containerStacked,
      ]}
    >
      <View
        style={[
          styles.left,
          { minWidth: 0 },
          stackActions && styles.leftStacked,
        ]}
      >
        {showBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(app)/')}
            style={({ pressed, hovered }: any) => [
              styles.backBtn,
              {
                backgroundColor: hovered ? colors.hover : colors.clayInnerLight,
              },

              pressed && { opacity: 0.75 },
              Platform.OS === 'web'
                ? ({
                    cursor: 'pointer',
                    transition: 'background-color 120ms ease',
                  } as any)
                : {},
            ]}
            hitSlop={8}
          >
            <ChevronLeft
              size={18}
              color={colors.textSecondary}
              strokeWidth={2}
            />
          </Pressable>
        )}
        <View
          style={[
            styles.titleBlock,
            { minWidth: 0, borderLeftColor: colors.primary },
          ]}
        >
          <Text
            accessibilityRole="header"
            style={[
              styles.title,
              { color: colors.textPrimary },
              compact && { fontSize: 21, lineHeight: 26 },
            ]}
            numberOfLines={2}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                styles.subtitle,
                { color: subtitleColor ?? colors.textSecondary },
                compact && { fontSize: 13, marginTop: 3 },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightAction && (
        <View
          style={[
            styles.right,
            { flexShrink: 0 },
            stackActions && styles.rightStacked,
          ]}
        >
          {rightAction}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    paddingTop: 6,
  },
  containerStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 14,
  },
  containerCompact: {
    marginBottom: 16,
    paddingTop: 2,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  leftStacked: {
    width: '100%',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    borderLeftWidth: 3,
    paddingLeft: 14,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    marginTop: 7,
    lineHeight: 22,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rightStacked: {
    width: '100%',
    alignSelf: 'stretch',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
});
