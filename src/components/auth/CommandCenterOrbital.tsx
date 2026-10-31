import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Platform } from 'react-native';
import Svg, {
  Circle,
  Ellipse,
  G,
  Line,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { COMMAND_CENTER } from '../../constants/commandCenterTheme';
import { useTheme } from '../../contexts/ThemeContext';

interface OrbitalProps {
  size?: number;
  activeClusterLabel?: string;
  isCaMode?: boolean;
}

export const CommandCenterOrbital: React.FC<OrbitalProps> = ({
  size = 460,
  activeClusterLabel = 'Primary Cluster',
  isCaMode = false,
}) => {
  const { reducedMotion } = useTheme();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const counterRotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) return;

    // Slow, stately orbital rotation (70 seconds full turn)
    const orbitLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 70000,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      })
    );

    // Counter rotation for secondary telemetry ring (45 seconds)
    const counterLoop = Animated.loop(
      Animated.timing(counterRotateAnim, {
        toValue: 1,
        duration: 45000,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      })
    );

    // Ambient core telemetry pulse
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 3200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );

    orbitLoop.start();
    counterLoop.start();
    pulseLoop.start();

    return () => {
      orbitLoop.stop();
      counterLoop.stop();
      pulseLoop.stop();
    };
  }, [reducedMotion, rotateAnim, counterRotateAnim, pulseAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const counterSpin = counterRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  const primaryAccent = isCaMode ? '#38BDF8' : COMMAND_CENTER.cobaltPrimary;
  const secondaryAccent = isCaMode ? '#818CF8' : COMMAND_CENTER.indigoAccent;

  return (
    <View style={[styles.container, { width: size, height: size }]} pointerEvents="none">
      {/* Background Radial Glow */}
      <View
        style={[
          styles.glowBackdrop,
          {
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: (size * 0.7) / 2,
            backgroundColor: isCaMode ? 'rgba(56, 189, 248, 0.08)' : 'rgba(10, 132, 255, 0.09)',
          },
        ]}
      />

      {/* Static Precision Grid & Coordinate Markers */}
      <Svg width={size} height={size} viewBox="0 0 500 500" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={primaryAccent} stopOpacity="0.32" />
            <Stop offset="60%" stopColor={primaryAccent} stopOpacity="0.08" />
            <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </RadialGradient>

          <LinearGradient id="orbitLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={primaryAccent} stopOpacity="0.45" />
            <Stop offset="50%" stopColor="rgba(255, 255, 255, 0.12)" stopOpacity="0.12" />
            <Stop offset="100%" stopColor={secondaryAccent} stopOpacity="0.4" />
          </LinearGradient>
        </Defs>

        {/* Precision Crosshairs */}
        <Line x1="250" y1="20" x2="250" y2="480" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 4" strokeWidth="1" />
        <Line x1="20" y1="250" x2="480" y2="250" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 4" strokeWidth="1" />

        {/* Central Ambient Core Light */}
        <Circle cx="250" cy="250" r="140" fill="url(#coreGlow)" />

        {/* Outer Coordinate Azimuth Ring */}
        <Circle cx="250" cy="250" r="228" stroke="rgba(255, 255, 255, 0.07)" strokeWidth="1" />
        <Circle cx="250" cy="250" r="218" stroke="rgba(56, 189, 248, 0.12)" strokeDasharray="2 12" strokeWidth="1.5" />

        {/* Azimuth Cardinal Ticks */}
        <Line x1="250" y1="22" x2="250" y2="30" stroke={primaryAccent} strokeWidth="1.5" />
        <Line x1="250" y1="470" x2="250" y2="478" stroke={primaryAccent} strokeWidth="1.5" />
        <Line x1="22" y1="250" x2="30" y2="250" stroke={primaryAccent} strokeWidth="1.5" />
        <Line x1="470" y1="250" x2="478" y2="250" stroke={primaryAccent} strokeWidth="1.5" />

        {/* Micro-Coordinate Labels */}
        <SvgText x="250" y="44" fill="rgba(255, 255, 255, 0.35)" fontSize="9" fontFamily={COMMAND_CENTER.fonts.mono} textAnchor="middle">
          000° // NORTH MATRIX
        </SvgText>
        <SvgText x="450" y="254" fill="rgba(255, 255, 255, 0.35)" fontSize="9" fontFamily={COMMAND_CENTER.fonts.mono} textAnchor="end">
          090° E
        </SvgText>
        <SvgText x="250" y="465" fill="rgba(255, 255, 255, 0.35)" fontSize="9" fontFamily={COMMAND_CENTER.fonts.mono} textAnchor="middle">
          180° S // SECURE GATEWAY
        </SvgText>
        <SvgText x="50" y="254" fill="rgba(255, 255, 255, 0.35)" fontSize="9" fontFamily={COMMAND_CENTER.fonts.mono} textAnchor="start">
          270° W
        </SvgText>

        {/* Static Inner Radar Reticle */}
        <Circle cx="250" cy="250" r="160" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="1" />
        <Circle cx="250" cy="250" r="95" stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="4 6" strokeWidth="1" />
      </Svg>

      {/* Layer 1: Forward Orbit (Elliptical Isometric Projection) */}
      <Animated.View
        style={[
          styles.orbitLayer,
          {
            transform: reducedMotion ? [] : [{ rotate: spin }],
          },
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 500 500">
          <G transform="rotate(32 250 250)">
            {/* Major Orbital Ellipse */}
            <Ellipse
              cx="250"
              cy="250"
              rx="195"
              ry="115"
              stroke="url(#orbitLineGrad)"
              strokeWidth="1.5"
              fill="none"
              strokeDasharray="6 3 24 3"
            />

            {/* Orbit Satellite Node 1: Cluster Gateway */}
            <Circle cx="445" cy="250" r="5.5" fill={primaryAccent} />
            <Circle cx="445" cy="250" r="12" stroke={primaryAccent} strokeWidth="1" opacity={0.4} />

            {/* Orbit Satellite Node 2: Telemetry Ingress */}
            <Circle cx="55" cy="250" r="4.5" fill="#38BDF8" />
            <Circle cx="55" cy="250" r="9" stroke="#38BDF8" strokeWidth="1" opacity={0.3} />
          </G>
        </Svg>
      </Animated.View>

      {/* Layer 2: Counter Orbit (Secondary Planetary Plane) */}
      <Animated.View
        style={[
          styles.orbitLayer,
          {
            transform: reducedMotion ? [] : [{ rotate: counterSpin }],
          },
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 500 500">
          <G transform="rotate(-38 250 250)">
            {/* Secondary Orbital Ring */}
            <Ellipse
              cx="250"
              cy="250"
              rx="155"
              ry="85"
              stroke="rgba(255, 255, 255, 0.14)"
              strokeWidth="1.2"
              fill="none"
            />

            {/* Minor Node: Encryption Matrix */}
            <Circle cx="405" cy="250" r="3.5" fill="#FFFFFF" />
            <Circle cx="95" cy="250" r="3" fill="rgba(255, 255, 255, 0.7)" />
          </G>
        </Svg>
      </Animated.View>

      {/* Layer 3: Central Nexus Core with Ambient Telemetry Pulse */}
      <Animated.View
        style={[
          styles.coreLayer,
          {
            transform: reducedMotion ? [] : [{ scale: pulseAnim }],
          },
        ]}
      >
        <Svg width={120} height={120} viewBox="0 0 120 120">
          {/* Inner Halo */}
          <Circle cx="60" cy="60" r="46" fill="rgba(10, 132, 255, 0.08)" stroke="rgba(10, 132, 255, 0.35)" strokeWidth="1" />
          <Circle cx="60" cy="60" r="34" fill="rgba(8, 14, 28, 0.92)" stroke="rgba(255, 255, 255, 0.18)" strokeWidth="1.2" />

          {/* Core Geometry Ticks */}
          <Line x1="60" y1="20" x2="60" y2="26" stroke={primaryAccent} strokeWidth="1.5" />
          <Line x1="60" y1="94" x2="60" y2="100" stroke={primaryAccent} strokeWidth="1.5" />
          <Line x1="20" y1="60" x2="26" y2="60" stroke={primaryAccent} strokeWidth="1.5" />
          <Line x1="94" y1="60" x2="100" y2="60" stroke={primaryAccent} strokeWidth="1.5" />

          {/* Core Status Dot */}
          <Circle cx="60" cy="60" r="7" fill={primaryAccent} />
          <Circle cx="60" cy="60" r="14" stroke={primaryAccent} strokeWidth="1" opacity={0.5} />
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowBackdrop: {
    position: 'absolute',
    filter: Platform.OS === 'web' ? 'blur(60px)' : undefined,
  } as any,
  orbitLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreLayer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
