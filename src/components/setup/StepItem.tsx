import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { Check, Lock, Terminal, Wrench } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface StepItemProps {
  type: 'Auto' | 'Manual' | 'Dev Task' | 'Action';
  title: string;
  description: string;
  isCompleted: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
  isLast?: boolean;
}

export function StepItem({ type, title, description, isCompleted, onToggle, children, isLast }: StepItemProps) {
  const { colors, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedCheckboxStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      backgroundColor: isCompleted ? colors.primary : 'transparent',
      borderColor: isCompleted ? colors.primary : colors.border,
    };
  });

  const animatedAutoCheckboxStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: isCompleted ? colors.success : colors.border,
      borderColor: isCompleted ? colors.success : colors.border,
    };
  });

  const handlePress = () => {
    if (type === 'Auto' || type === 'Action') return;
    scale.value = withSpring(0.8, { damping: 10, stiffness: 200 }, () => {
      scale.value = withSpring(1);
    });
    if (onToggle) onToggle();
  };

  const renderTag = () => {
    switch (type) {
      case 'Dev Task':
        return (
          <View style={[styles.tag, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '30' }]}>
            <Terminal size={12} color={colors.warning} style={styles.tagIcon} />
            <Text style={[styles.tagText, { color: colors.warning }]}>Dev Task</Text>
          </View>
        );
      case 'Auto':
        return (
          <View style={[styles.tag, { backgroundColor: colors.success + '15', borderColor: colors.success + '30' }]}>
            <Lock size={12} color={colors.success} style={styles.tagIcon} />
            <Text style={[styles.tagText, { color: colors.success }]}>Auto</Text>
          </View>
        );
      case 'Manual':
      case 'Action':
        return (
          <View style={[styles.tag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Wrench size={12} color={colors.textSecondary} style={styles.tagIcon} />
            <Text style={[styles.tagText, { color: colors.textSecondary }]}>Manual</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Timeline Line */}
      {!isLast && (
        <View 
          style={[
            styles.timelineLine, 
            { backgroundColor: isCompleted ? colors.success : colors.border }
          ]} 
        />
      )}

      <View style={styles.headerRow}>
        <Pressable
          style={styles.checkboxContainer}
          onPress={handlePress}
          disabled={type === 'Auto' || type === 'Action'}
        >
          {type === 'Auto' ? (
            <Animated.View style={[styles.checkbox, styles.autoCheckbox, animatedAutoCheckboxStyle]}>
              {isCompleted ? <Check size={16} color="#FFFFFF" strokeWidth={3} /> : <Lock size={14} color={colors.textSecondary} />}
            </Animated.View>
          ) : type !== 'Action' ? (
            <Animated.View style={[styles.checkbox, animatedCheckboxStyle]}>
              {isCompleted && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
            </Animated.View>
          ) : (
             <View style={{ width: 24, height: 24 }} /> // Placeholder for alignment
          )}
        </Pressable>

        <View style={styles.titleContainer}>
          <Text
            style={[
              styles.title,
              isCompleted && { color: colors.textSecondary, textDecorationLine: 'line-through' },
              !isCompleted && { color: colors.textPrimary, fontWeight: '700' }
            ]}
          >
            {title}
          </Text>
          {renderTag()}
        </View>
      </View>

      <View style={styles.contentContainer}>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
        {children && <View style={styles.childrenWrapper}>{children}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxOuter: {
    paddingTop: 2,
    marginRight: 12,
    zIndex: 2,
  },
  timelineLine: {
    position: 'absolute',
    left: 11,
    top: 26,
    bottom: -16,
    width: 2,
    borderRadius: 1,
    zIndex: 1,
  },
  checkboxContainer: {
    marginRight: 12,
    zIndex: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoCheckbox: {
    borderWidth: 0,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  title: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
    marginRight: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    borderWidth: 1,
  },
  tagIcon: {
    marginRight: 4,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contentContainer: {
    paddingLeft: 24 + 12, // Checkbox width + margin
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  childrenWrapper: {
    marginTop: 16,
  },
});
