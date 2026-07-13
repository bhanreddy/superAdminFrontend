import React, { useRef } from 'react';
import { View, StyleSheet, Platform, ViewStyle, Animated, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const clayTokens = {
  radius: { card: 24, button: 16, input: 14, pill: 999 },
  highlight: 'rgba(255,255,255,0.16)',
  edge: 'rgba(76, 90, 120, 0.10)',
  text: '#2A3142',
  textMuted: '#6B7590',
};

type ClayViewProps = {
  children: React.ReactNode;
  color?: string;
  radius?: number;
  style?: ViewStyle | ViewStyle[];
  flat?: boolean;
  isDark?: boolean; // For Hybrid approach
};

export function ClayView({ children, color = '#EEF1F8', radius = 24, style, flat, isDark = false }: ClayViewProps) {
  // Hybrid Glass/Neon approach for Dark Mode
  if (isDark) {
    return (
      <View
        style={[
          {
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderRadius: radius,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          },
          style,
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.06)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {children}
      </View>
    );
  }

  // Pure Claymorphism for Light Mode
  return (
    <View
      style={[
        styles.base,
        { backgroundColor: color, borderRadius: radius },
        !flat && styles.shadow,
        style,
      ]}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 0.9 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

export function PressScale({ children, onPress, style, disabled }: any) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, { toValue: 0.96, duration: 100, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 180, friction: 8, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(76,90,120,0.08)',
  },
  shadow: Platform.select({
    ios: {
      shadowColor: '#6B7A99',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 18,
      overflow: 'visible',
    },
    android: { elevation: 3 },
    web: {
      boxShadow: '0px 10px 18px rgba(107, 122, 153, 0.12)',
    }
  }) as object,
});
