import React, { useState, useRef } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, Pressable, ViewStyle, Animated, Platform } from 'react-native';
import { pressableWebStyles } from '../../utils/webPressable';
import { useTheme } from '../../contexts/ThemeContext';
import { darkTheme } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  /** Renders a minimal required indicator next to the label (no asterisk). */
  required?: boolean;
  error?: string;
  containerStyle?: ViewStyle;
  /** Force dark field styling (e.g. branded auth screens) regardless of app theme. */
  tone?: 'auto' | 'dark';
}

const WEB_INPUT_RESET =
  Platform.OS === 'web'
    ? ({
        outlineWidth: 0,
        outlineStyle: 'none',
        outlineColor: 'transparent',
        boxShadow: 'none',
      } as const)
    : null;

export const Input: React.FC<InputProps> = React.memo(({
  label,
  required,
  error,
  secureTextEntry,
  containerStyle,
  tone = 'auto',
  style,
  onFocus,
  onBlur,
  ...props
}) => {
  const theme = useTheme();
  const forceDark = tone === 'dark';
  const isDark = forceDark || theme.isDark;
  const colors = forceDark ? darkTheme.colors : theme.colors;
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
    outputRange: [
      isDark ? 'rgba(255,255,255,0.10)' : colors.clayBorderColor,
      `${colors.primary}70`,
    ],
  });

  const fieldBg = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const labelColor = isFocused ? colors.primary : (isDark ? 'rgba(235,235,245,0.72)' : colors.textSecondary);
  const mutedColor = isDark ? 'rgba(235,235,245,0.55)' : colors.textSecondary;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: labelColor }]}>
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
            backgroundColor: fieldBg,
          },
          // Soft Apple-grade inset tray and focus glow
          Platform.OS === 'web' ? {
            boxShadow: isFocused
              ? isDark
                ? `inset 1.5px 1.5px 4px rgba(0,0,0,0.45), inset -1.5px -1.5px 4px rgba(255,255,255,0.04), 0 0 0 3px ${colors.primary}28`
                : `inset 1.5px 1.5px 4px rgba(0,0,0,0.08), inset -1.5px -1.5px 4px rgba(255,255,255,0.7), 0 0 0 4px ${colors.primary}25`
              : isDark
                ? 'inset 1.5px 1.5px 4px rgba(0,0,0,0.35), inset -1.5px -1.5px 4px rgba(255,255,255,0.04)'
                : 'inset 1.5px 1.5px 4px rgba(0,0,0,0.05), inset -1.5px -1.5px 4px rgba(255,255,255,0.6)',
            transition: 'border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
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
            { color: colors.textPrimary },
            WEB_INPUT_RESET as any,
            style,
          ]}
          placeholderTextColor={isDark ? 'rgba(235,235,245,0.38)' : '#938FA8'}
          onFocus={(e) => {
            handleFocus();
            onFocus?.(e);
          }}
          onBlur={(e) => {
            handleBlur();
            onBlur?.(e);
          }}
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
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            <Text style={[styles.eyeText, { color: isFocused ? colors.primary : mutedColor }]}>
              {isPasswordVisible ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        )}
      </Animated.View>
      {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}
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
    paddingLeft: 16,
    paddingRight: 6,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    minWidth: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingRight: 8,
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0.1,
    minHeight: 48,
  },
  eyeIcon: {
    flexShrink: 0,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginRight: 2,
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
