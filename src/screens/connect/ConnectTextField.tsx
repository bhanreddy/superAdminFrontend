import React, { forwardRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import type { TextInputProps, StyleProp, ViewStyle } from 'react-native';
import type { ThemeColors } from '../../constants/theme';

type Props = TextInputProps & {
  colors: ThemeColors;
  helper?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

// A persistent label and an explicit line box keep single/multiline fields
// readable on native Android and mobile Safari, including larger system text.
export const ConnectTextField = forwardRef<TextInput, Props>(
  function ConnectTextField(
    {
      colors,
      helper,
      containerStyle,
      style,
      multiline,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) {
    const [focused, setFocused] = useState(false);
    const { fontScale = 1 } = useWindowDimensions();
    const lineHeight = Math.ceil(22 * fontScale);
    const height = multiline
      ? Math.max(104, lineHeight * 3 + 24)
      : Math.max(48, lineHeight + 26);
    return (
      <View style={[styles.field, containerStyle]}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {props.accessibilityLabel || props.placeholder}
        </Text>
        <TextInput
          {...props}
          ref={ref}
          multiline={multiline}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.primary}
          underlineColorAndroid="transparent"
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.input,
            style,
            {
              height,
              minHeight: height,
              maxHeight: multiline ? Math.max(180, height) : undefined,
              fontSize: 16,
              lineHeight: 22,
              marginBottom: 0,
              color: colors.textPrimary,
              borderColor: focused ? colors.primary : colors.border,
              backgroundColor: colors.surface,
            },
            Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
          ]}
        />
        {!!helper && (
          <Text style={[styles.helper, { color: colors.textSecondary }]}>
            {helper}
          </Text>
        )}
      </View>
    );
  },
);
const styles = StyleSheet.create({
  field: { minWidth: 0, marginBottom: 16 },
  label: { fontSize: 13, lineHeight: 20, fontWeight: '600', marginBottom: 6 },
  input: {
    width: '100%',
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  helper: { fontSize: 12, lineHeight: 18, marginTop: 5 },
});
