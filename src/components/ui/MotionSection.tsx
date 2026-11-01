import React, { useEffect } from 'react';
import { type ViewProps } from 'react-native';
import Animated, { cancelAnimation, FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { animation } from '../../constants/theme';

/** Animate a handful of sections once, never every row in a scrolling list. */
export function MotionSection({
  index = 0,
  transitionKey,
  children,
  style,
  ...props
}: ViewProps & { index?: number; /** Animate a state change without remounting inputs or lists. */ transitionKey?: string | number }) {
  const { reducedMotion } = useTheme();
  const opacity = useSharedValue(1);
  const offset = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(opacity);
    cancelAnimation(offset);
    if (reducedMotion || transitionKey === undefined) {
      opacity.value = 1;
      offset.value = 0;
    } else {
      opacity.value = 0.72;
      offset.value = 8;
      opacity.value = withTiming(1, { duration: animation.slow });
      offset.value = withTiming(0, { duration: animation.slow });
    }
    return () => { cancelAnimation(opacity); cancelAnimation(offset); };
  }, [transitionKey, reducedMotion, opacity, offset]);
  const motion = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: offset.value }] }));
  return (
    <Animated.View
      {...props}
      style={[style, transitionKey !== undefined && motion]}
      entering={
        reducedMotion || transitionKey !== undefined
          ? undefined
          : FadeInDown.duration(animation.entrance).delay(
              Math.min(index, 4) * animation.stagger
            )
      }
    >
      {children}
    </Animated.View>
  );
}
