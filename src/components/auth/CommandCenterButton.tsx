import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  Platform,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { COMMAND_CENTER } from '../../constants/commandCenterTheme';
import { safePressHandler } from '../../utils/safePressHandler';

export interface CommandCenterButtonProps {
  title: string;
  onPress: () => void | Promise<void>;
  loading?: boolean;
  success?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  variant?: 'primary' | 'secondary' | 'ghost';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const CommandCenterButton: React.FC<CommandCenterButtonProps> = ({
  title,
  onPress,
  loading = false,
  success = false,
  disabled = false,
  style,
  variant = 'primary',
  leftIcon,
  rightIcon,
}) => {
  const isBlocked = disabled || loading || success;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isBlocked, busy: loading }}
      aria-busy={loading}
      disabled={isBlocked}
      onPress={safePressHandler(onPress)}
      style={({ pressed, hovered }: any) => [
        styles.base,
        variant === 'secondary' && styles.secondaryBase,
        variant === 'ghost' && styles.ghostBase,
        isBlocked && styles.disabledBase,
        pressed && !isBlocked && styles.pressedBase,
        hovered && !isBlocked && styles.hoveredBase,
        Platform.OS === 'web'
          ? ({
              cursor: isBlocked ? 'not-allowed' : 'pointer',
              transition: 'transform 120ms ease, box-shadow 150ms ease, opacity 120ms ease',
              boxShadow: isBlocked
                ? 'none'
                : variant === 'primary'
                ? hovered
                  ? '0 10px 30px -4px rgba(10, 132, 255, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                  : '0 6px 20px -4px rgba(10, 132, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                : 'none',
              transform: pressed && !isBlocked ? 'scale(0.99)' : 'none',
            } as any)
          : null,
        style,
      ]}
    >
      {/* Primary Radiant Gradient with Specular Sheen */}
      {variant === 'primary' && !isBlocked && (
        <LinearGradient
          colors={['#1E7BFF', '#0A84FF', '#0066D6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Top Specular Rim */}
      <View style={styles.topSpecular} pointerEvents="none" />

      {/* Content Layout */}
      <View style={styles.contentRow}>
        {loading ? (
          <>
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Authenticating Terminal...</Text>
          </>
        ) : success ? (
          <>
            <CheckCircle2 size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Access Granted</Text>
          </>
        ) : (
          <>
            {leftIcon && <View style={styles.iconBox}>{leftIcon}</View>}
            <Text
              style={[
                styles.buttonText,
                variant === 'secondary' && styles.secondaryText,
                variant === 'ghost' && styles.ghostText,
              ]}
            >
              {title}
            </Text>
            {rightIcon !== undefined ? (
              <View style={styles.iconBox}>{rightIcon}</View>
            ) : variant === 'primary' ? (
              <View style={styles.iconBox}>
                <ArrowRight size={17} color="#FFFFFF" />
              </View>
            ) : null}
          </>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 50,
    width: '100%',
    borderRadius: COMMAND_CENTER.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COMMAND_CENTER.cobaltPrimary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  secondaryBase: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: COMMAND_CENTER.glassBorder,
  },
  ghostBase: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  disabledBase: {
    opacity: 0.55,
    backgroundColor: 'rgba(10, 132, 255, 0.4)',
  },
  pressedBase: {
    opacity: 0.88,
  },
  hoveredBase: {
    opacity: 0.96,
  },
  topSpecular: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  secondaryText: {
    color: COMMAND_CENTER.textPrimary,
  },
  ghostText: {
    color: COMMAND_CENTER.cobaltPrimary,
  },
  iconBox: {
    marginLeft: 8,
  },
});
