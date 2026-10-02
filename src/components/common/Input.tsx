import React, { forwardRef, useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { commonStyles, theme } from '../../theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string | null;
  hint?: string;
  leftIcon?: React.ReactNode;
  inputStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, hint, leftIcon, inputStyle, containerStyle, editable = true, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    const borderColor = error
      ? theme.colors.rose[500]
      : focused
        ? theme.colors.mint[300]
        : theme.colors.line;

    return (
      <View style={[styles.container, containerStyle]}>
        {label ? <Text style={commonStyles.label}>{label}</Text> : null}

        <View style={styles.wrapper}>
          {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
          <TextInput
            ref={ref}
            editable={editable}
            placeholderTextColor={theme.colors.ink[400]}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            style={[
              commonStyles.input,
              { borderColor },
              leftIcon ? styles.withLeftIcon : null,
              !editable ? commonStyles.inputDisabled : null,
              inputStyle,
            ]}
            {...props}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!error && hint ? <Text style={styles.hintText}>{hint}</Text> : null}
      </View>
    );
  },
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftIcon: {
    position: 'absolute',
    left: theme.spacing[3.5],
    zIndex: 1,
  },
  withLeftIcon: {
    paddingLeft: theme.spacing[10],
  },
  errorText: {
    fontSize: theme.fontSize.tiny,
    color: theme.colors.rose[600],
    marginTop: theme.spacing[1],
  },
  hintText: {
    fontSize: theme.fontSize.tiny,
    color: theme.colors.ink[500],
    marginTop: theme.spacing[1],
  },
});

interface TextAreaProps extends InputProps {
  minHeight?: number;
}

export const TextArea = forwardRef<TextInput, TextAreaProps>(
  ({ minHeight = 110, inputStyle, ...props }, ref) => (
    <Input
      ref={ref}
      multiline
      textAlignVertical="top"
      inputStyle={[{ minHeight }, inputStyle]}
      {...props}
    />
  ),
);

TextArea.displayName = 'TextArea';
