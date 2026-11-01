import React, { useEffect, useState } from 'react';
import {
  Pressable,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
  type View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { animation } from '../../constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
type InteractionState = PressableStateCallbackType & {
  hovered: boolean;
  focused: boolean;
};
export interface MotionPressableProps
  extends Omit<PressableProps, 'style' | 'children'> {
  children?: React.ReactNode;
  style?:
    | StyleProp<ViewStyle>
    | ((state: InteractionState) => StyleProp<ViewStyle>);
  /** Lift is reserved for cards; controls stay anchored to their layout. */
  lift?: boolean;
}

/** One transform-only interaction contract for navigation, cards and controls. */
export const MotionPressable = React.memo(
  React.forwardRef<View, MotionPressableProps>(function MotionPressable(
    {
      children,
      style,
      lift = false,
      disabled,
      onPressIn,
      onPressOut,
      onHoverIn,
      onHoverOut,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) {
    const { reducedMotion } = useTheme();
    const [pressed, setPressed] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const scale = useSharedValue(1);
    const y = useSharedValue(0);
    useEffect(() => {
      if (reducedMotion || disabled) {
        cancelAnimation(scale);
        cancelAnimation(y);
        scale.value = 1;
        y.value = 0;
        return;
      }
      scale.value = pressed
        ? withTiming(0.98, { duration: animation.pressIn })
        : withSpring(1, animation.pressSpring);
      y.value = withTiming(lift && hovered && !pressed ? -3 : 0, {
        duration: animation.pressOut,
      });
    }, [pressed, hovered, lift, disabled, reducedMotion, scale, y]);
    const motion = useAnimatedStyle(() => ({
      transform: [{ translateY: y.value }, { scale: scale.value }],
    }));
    const state = { pressed, hovered, focused };
    return (
      <AnimatedPressable
        {...props}
        ref={ref}
        disabled={disabled}
        onPressIn={(event) => {
          setPressed(true);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          setPressed(false);
          onPressOut?.(event);
        }}
        onHoverIn={(event) => {
          setHovered(true);
          onHoverIn?.(event);
        }}
        onHoverOut={(event) => {
          setHovered(false);
          onHoverOut?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          setPressed(false);
          onBlur?.(event);
        }}
        style={[typeof style === 'function' ? style(state) : style, motion]}
      >
        {children}
      </AnimatedPressable>
    );
  })
);
