/**
 * AppSplash.tsx
 * Animated splash screen overlay that shows the LogoLoader animation,
 * then fades out and calls onFinish.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LogoLoader from './LogoLoader';

interface AppSplashProps {
  onFinish: () => void;
}

export default function AppSplash({ onFinish }: AppSplashProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setFinished(true);
        onFinish();
      });
    }, 1500);

    // Fallback safety timer
    const safetyTimer = setTimeout(() => {
      setFinished(true);
      onFinish();
    }, 2500);

    return () => {
      clearTimeout(timer);
      clearTimeout(safetyTimer);
    };
  }, []);

  if (finished) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <LinearGradient
        colors={['#0A0A14', '#0D1126', '#0A0A14']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Subtle radial glow behind the logo */}
      <View style={styles.glowOrb} />
      <LogoLoader size={80} color="#6C63FF" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowOrb: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(108, 99, 255, 0.08)',
  },
});
