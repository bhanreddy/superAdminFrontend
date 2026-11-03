import { MotionPressable } from './MotionPressable';
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
import { borderRadius, workspaceUi } from '../../constants/theme';
import { getCardTone } from '../../constants/experienceColors';
import { workspaceTones } from '../../constants/workspaceDesign';

interface ScreenHeaderProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  /** Override default tertiary subtitle color for better contrast on dense screens. */
  subtitleColor?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  showThemeToggle?: boolean;
}

export const ScreenHeader = React.memo(function ScreenHeader({
  title,
  eyebrow,
  subtitle,
  subtitleColor,
  showBack = false,
  rightAction,
}: ScreenHeaderProps) {
  const router = useRouter();
  const { colors, isDark, workspaceModule = 'overview' } = useTheme();
  const paint = getCardTone(workspaceTones[workspaceModule], isDark);
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
          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace('/(app)/')
            }
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
          </MotionPressable>
        )}
        <View
          style={[
            styles.titleBlock,
            { minWidth: 0, borderLeftColor: paint.accent },
          ]}
        >
          {eyebrow && (
            <Text style={[styles.eyebrow, { color: paint.accent }]}>{eyebrow}</Text>
          )}
          <Text
            accessibilityRole="header"
            style={[
              styles.title,
              { color: colors.textPrimary },
              compact && workspaceUi.phoneTitle,
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
    marginBottom: workspaceUi.sectionGap,
    paddingTop: 0,
  },
  containerStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 14,
  },
  containerCompact: {
    marginBottom: workspaceUi.sectionGap,
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
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    borderLeftWidth: 3,
    paddingLeft: 12,
  },
  title: {
    ...workspaceUi.pageTitle,
  },
  eyebrow: {
    ...workspaceUi.caption,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  subtitle: {
    ...workspaceUi.body,
    fontWeight: '400',
    marginTop: 4,
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
