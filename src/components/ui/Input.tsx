import React, { useId, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  Pressable,
  ViewStyle,
  Platform,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { darkTheme } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  required?: boolean;
  error?: string;
  containerStyle?: ViewStyle;
  tone?: 'auto' | 'dark';
  /** Retained for compatibility. Focus uses immediate state, with no JS animation. */
  animateFocus?: boolean;
}
export const Input = React.memo(
  React.forwardRef<TextInput, InputProps>(function Input(
    {
      label,
      required,
      error,
      secureTextEntry,
      containerStyle,
      tone = 'auto',
      animateFocus: _animateFocus,
      style,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) {
    const theme = useTheme();
    const colors = tone === 'dark' ? darkTheme.colors : theme.colors;
    const [focused, setFocused] = useState(false);
    const [visible, setVisible] = useState(false);
    const id = useId();
    const errorId = `field-error-${id}`;
    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {label}
            </Text>
            {required && (
              <Text style={[styles.required, { color: colors.textSecondary }]}>
                Required
              </Text>
            )}
          </View>
        )}
        <View
          style={[
            styles.wrapper,
            {
              backgroundColor: colors.inputBg || colors.surface,
              borderColor: error
                ? colors.error
                : focused
                  ? colors.primary
                  : colors.border,
            },
            Platform.OS === 'web'
              ? ({
                  boxShadow: focused ? `0 0 0 3px ${colors.primary}18` : 'none',
                  transition: 'border-color 120ms ease',
                } as any)
              : null,
          ]}
        >
          <TextInput
            ref={ref}
            {...props}
            accessibilityLabel={props.accessibilityLabel || label}
            accessibilityHint={[props.accessibilityHint, required ? 'Required' : '', error].filter(Boolean).join('. ') || undefined}
            {...(Platform.OS === 'web' ? {
              'aria-required': Boolean(required),
              'aria-invalid': Boolean(error),
              'aria-describedby': error ? errorId : undefined,
            } : {})}
            style={[
              styles.input,
              props.multiline && styles.multiline,
              { color: colors.textPrimary },
              style,
              { fontSize: 16 },
              Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
            ]}
            placeholderTextColor={
              props.placeholderTextColor || colors.textTertiary
            }
            selectionColor={colors.primary}
            underlineColorAndroid="transparent"
            secureTextEntry={Boolean(secureTextEntry && !visible)}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
          />
          {secureTextEntry && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={visible ? 'Hide password' : 'Show password'}
              onPress={() => setVisible((value) => !value)}
              style={styles.eye}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontSize: 13,
                  fontWeight: '600',
                }}
              >
                {visible ? 'Hide' : 'Show'}
              </Text>
            </Pressable>
          )}
        </View>
        {error ? (
          <Text
            nativeID={errorId}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[styles.error, { color: colors.error }]}
          >
            {error}
          </Text>
        ) : null}
      </View>
    );
  }),
);
const styles = StyleSheet.create({
  container: { marginBottom: 18, minWidth: 0 },
  labelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  label: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  required: { fontSize: 12 },
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 11,
    paddingLeft: 14,
    paddingRight: 4,
  },
  input: {
    flex: 1,
    minWidth: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingRight: 10,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 48,
  },
  multiline: { minHeight: 112, textAlignVertical: 'top' },
  eye: {
    minWidth: 48,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  error: { fontSize: 13, lineHeight: 19, marginTop: 7 },
});
