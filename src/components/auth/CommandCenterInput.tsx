import React, { useState, useId, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  Pressable,
  StyleSheet,
  Platform,
  ViewStyle,
} from 'react-native';
import {
  Mail,
  Phone,
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react-native';
import { brandColors } from '../../constants/experienceColors';
import { COMMAND_CENTER } from '../../constants/commandCenterTheme';

export interface CommandCenterInputProps extends TextInputProps {
  label: string;
  appearance?: 'dark' | 'light';
  badge?: string;
  error?: string;
  required?: boolean;
  detectType?: boolean;
  containerStyle?: ViewStyle;
}

export const CommandCenterInput = forwardRef<
  TextInput,
  CommandCenterInputProps
>(
  (
    {
      label,
      appearance = 'dark',
      badge,
      error,
      required,
      detectType = false,
      secureTextEntry,
      containerStyle,
      value = '',
      onChangeText,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const isLight = appearance === 'light';
    const accent = isLight ? brandColors.blue : COMMAND_CENTER.cobaltPrimary;
    const iconColor = isLight ? '#6B7D94' : COMMAND_CENTER.textTertiary;
    const [focused, setFocused] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [capsLockOn, setCapsLockOn] = useState(false);
    const id = useId();
    const errorId = `command-input-error-${id}`;

    // Auto-detect identifier icon based on input format
    const renderPrefixIcon = () => {
      if (secureTextEntry) {
        return <Lock size={18} color={focused ? accent : iconColor} />;
      }

      if (detectType && typeof value === 'string' && value.trim()) {
        const trimmed = value.trim();
        // Check for email
        if (trimmed.includes('@')) {
          return <Mail size={18} color={focused ? accent : iconColor} />;
        }
        // Check for phone number (digits, optionally starting with +)
        if (/^\+?[0-9\s\-()]{4,}$/.test(trimmed)) {
          return <Phone size={18} color={focused ? accent : iconColor} />;
        }
        // Check for employee ID patterns (e.g., SE-011, FND-001, EMP-101, CA-01)
        if (/^[a-zA-Z]{1,5}[-_]?[0-9]{1,6}$/i.test(trimmed)) {
          return <ShieldCheck size={18} color={focused ? accent : iconColor} />;
        }
      }

      return <User size={18} color={focused ? accent : iconColor} />;
    };

    // Caps lock detection on web
    const handleKeyDown = (e: any) => {
      if (
        Platform.OS === 'web' &&
        secureTextEntry &&
        typeof e?.getModifierState === 'function'
      ) {
        setCapsLockOn(e.getModifierState('CapsLock'));
      }
    };

    const isEffectivelySecure = Boolean(secureTextEntry && !passwordVisible);

    return (
      <View style={[styles.container, containerStyle]}>
        {/* Label Row */}
        <View style={styles.labelRow}>
          <Text style={[styles.label, isLight && styles.lightLabel]}>
            {label}
            {required && (
              <Text style={[styles.requiredMark, isLight && { color: accent }]}>
                {' '}
                *
              </Text>
            )}
          </Text>

          {badge && <Text style={styles.badge}>{badge}</Text>}
        </View>

        {/* Input Wrapper with Liquid-Glass Border & Glow */}
        <View
          style={[
            styles.wrapper,
            focused && styles.wrapperFocused,
            isLight && styles.lightWrapper,
            isLight && focused && styles.lightWrapperFocused,
            Boolean(error) && styles.wrapperError,
            Platform.OS === 'web'
              ? ({
                  boxShadow: isLight
                    ? error
                      ? '0 0 0 1px #B94538'
                      : focused
                      ? '0 0 0 3px rgba(36,85,198,0.12)'
                      : 'none'
                    : error
                    ? '0 0 0 1px rgba(255, 69, 58, 0.5), 0 0 16px rgba(255, 69, 58, 0.2)'
                    : focused
                    ? `0 0 0 1px ${COMMAND_CENTER.cobaltPrimary}, 0 0 20px ${COMMAND_CENTER.cobaltGlow}`
                    : 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                  transition:
                    'border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease',
                } as any)
              : null,
          ]}
        >
          {/* Specular Highlight along Top Rim */}
          <View style={styles.specularTopRim} pointerEvents="none" />

          {/* Leading Icon */}
          {!isLight && (
            <View style={styles.prefixIconBox}>{renderPrefixIcon()}</View>
          )}

          {/* Text Input */}
          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={isEffectivelySecure}
            placeholderTextColor={isLight ? '#6E7C8F' : '#8292AC'}
            selectionColor={accent}
            style={[
              styles.input,
              isLight && styles.lightInput,
              Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
              props.style,
            ]}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              setCapsLockOn(false);
              onBlur?.(e);
            }}
            accessibilityLabel={props.accessibilityLabel || label}
            {...(Platform.OS === 'web'
              ? {
                  'aria-required': Boolean(required),
                  'aria-invalid': Boolean(error),
                  'aria-describedby': error ? errorId : undefined,
                  onKeyDown: handleKeyDown,
                }
              : {})}
            {...props}
          />

          {/* Secure Entry Show/Hide Toggle */}
          {secureTextEntry && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                passwordVisible ? 'Hide password' : 'Show password'
              }
              onPress={() => setPasswordVisible((v) => !v)}
              style={({ pressed }) => [
                styles.eyeButton,
                pressed && { opacity: 0.7 },
              ]}
            >
              {passwordVisible ? (
                <EyeOff size={18} color={accent} />
              ) : (
                <Eye size={18} color={iconColor} />
              )}
            </Pressable>
          )}
        </View>

        {/* Caps Lock Warning Banner */}
        {capsLockOn && secureTextEntry && (
          <View style={styles.capsLockBox}>
            <AlertTriangle size={13} color={COMMAND_CENTER.statusWarning} />
            <Text style={styles.capsLockText}>Caps Lock is active</Text>
          </View>
        )}

        {/* Inline Error Message */}
        {error ? (
          <Text
            nativeID={errorId}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[styles.errorText, isLight && { color: '#B3382E' }]}
          >
            {error}
          </Text>
        ) : null}
      </View>
    );
  }
);

CommandCenterInput.displayName = 'CommandCenterInput';

const styles = StyleSheet.create({
  lightLabel: { color: '#3B4D65', fontSize: 12, fontWeight: '500' },
  lightWrapper: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CAD5E3',
    borderRadius: 6,
    height: 50,
  },
  lightWrapperFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: brandColors.blue,
  },
  lightInput: { color: '#1D2A3E', paddingLeft: 14, fontSize: 14 },
  container: {
    marginBottom: 20,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#CBD6E8',
    letterSpacing: 0.1,
  },
  requiredMark: {
    color: COMMAND_CENTER.cobaltPrimary,
  },
  badge: {
    fontSize: 11,
    fontFamily: COMMAND_CENTER.fonts.mono,
    color: COMMAND_CENTER.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#0C1525',
    borderWidth: 1,
    borderColor: '#35435B',
    borderRadius: 9,
    overflow: 'hidden',
    position: 'relative',
  },
  wrapperFocused: {
    backgroundColor: COMMAND_CENTER.surfaceInputFocused,
    borderColor: COMMAND_CENTER.glassBorderFocus,
  },
  wrapperError: {
    borderColor: COMMAND_CENTER.statusError,
  },
  specularTopRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
  },
  prefixIconBox: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    color: COMMAND_CENTER.textPrimary,
    fontSize: 14,
    fontWeight: '400',
    paddingRight: 12,
  },
  eyeButton: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 4,
  },
  capsLockBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: COMMAND_CENTER.radii.xs,
    backgroundColor: COMMAND_CENTER.statusWarningBg,
  },
  capsLockText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: COMMAND_CENTER.statusWarning,
  },
  errorText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: COMMAND_CENTER.statusError,
    marginTop: 6,
    paddingHorizontal: 2,
    lineHeight: 18,
  },
});
