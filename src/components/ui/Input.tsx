import React, { useState, useRef } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, Pressable, ViewStyle, Animated, Platform } from 'react-native';
import { pressableWebStyles } from '../../utils/webPressable';
import { useTheme } from '../../contexts/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  /** Renders a minimal required indicator next to the label (no asterisk). */
  required?: boolean;
  error?: string;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = React.memo(({ label, required, error, secureTextEntry, containerStyle, ...props }) => {
  const { colors, isDark, clayShadows } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  const isPassword = secureTextEntry;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(focusAnim, {
      toValue: 1,
      tension: 200,
      friction: 20,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(focusAnim, {
      toValue: 0,
      tension: 200,
      friction: 20,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.clayBorderColor, `${colors.primary}50`],
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: isFocused ? colors.primary : colors.textSecondary }]}>
            {label}
          </Text>
          {required ? (
            <View
              accessibilityLabel="Required field"
              style={[styles.requiredDot, { backgroundColor: colors.primary }]}
            />
          ) : null}
        </View>
      )}
      <Animated.View
        style={[
          styles.inputWrapper,
          {
            borderColor: error ? colors.error : borderColor,
            backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF',
          },
          // Soft Apple-grade inset tray and focus glow
          Platform.OS === 'web' ? {
            boxShadow: isFocused
              ? isDark
                ? `inset 1.5px 1.5px 4px rgba(0,0,0,0.4), inset -1.5px -1.5px 4px rgba(255,255,255,0.03), 0 0 0 4px ${colors.primary}30`
                : `inset 1.5px 1.5px 4px rgba(0,0,0,0.08), inset -1.5px -1.5px 4px rgba(255,255,255,0.7), 0 0 0 4px ${colors.primary}25`
              : isDark
                ? 'inset 1.5px 1.5px 4px rgba(0,0,0,0.3), inset -1.5px -1.5px 4px rgba(255,255,255,0.02)'
                : 'inset 1.5px 1.5px 4px rgba(0,0,0,0.05), inset -1.5px -1.5px 4px rgba(255,255,255,0.6)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          } as any : {
            shadowColor: '#000',
            shadowOffset: { width: 1, height: 1 },
            shadowOpacity: isDark ? 0.2 : 0.05,
            shadowRadius: 4,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              ...(Platform.OS === 'web' ? { outlineWidth: 0 } as any : {}),
            },
          ]}
          placeholderTextColor={isDark ? 'rgba(160,157,181,0.5)' : '#938FA8'}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={isPassword && !isPasswordVisible}
          {...props}
        />
        {isPassword && (
          <Pressable
            style={({ pressed }) => [
              styles.eyeIcon,
              ...pressableWebStyles(pressed, { pressedOpacity: 0.75 }),
            ]}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            <Text style={[styles.eyeText, { color: isFocused ? colors.primary : colors.textSecondary }]}>
              {isPasswordVisible ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        )}
      </Animated.View>
      {error && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  requiredDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 1,
    opacity: 0.85,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  eyeIcon: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  eyeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
});
