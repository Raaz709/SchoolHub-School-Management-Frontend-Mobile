import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { commonStyles, theme } from '../../theme';
import { Icon, type IconName } from '../Icon';

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'mint' | 'link';

interface ButtonProps {
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  icon?: IconName;
  /** Stretch to the full width of the parent. */
  block?: boolean;
  accessibilityLabel?: string;
}

const containerByVariant: Record<ButtonVariant, ViewStyle> = {
  primary: commonStyles.buttonPrimary,
  ghost: commonStyles.buttonGhost,
  danger: commonStyles.buttonDanger,
  mint: commonStyles.buttonMint,
  link: commonStyles.buttonLink,
};

const textByVariant = {
  primary: commonStyles.buttonPrimaryText,
  ghost: commonStyles.buttonGhostText,
  danger: commonStyles.buttonDangerText,
  mint: commonStyles.buttonMintText,
  link: commonStyles.buttonLinkText,
} as const;

const iconColorByVariant: Record<ButtonVariant, string> = {
  primary: theme.colors.white,
  ghost: theme.colors.ink[700],
  danger: theme.colors.rose[600],
  mint: theme.colors.mint[600],
  link: theme.colors.mint[600],
};

export function Button({
  variant = 'primary',
  loading = false,
  disabled = false,
  children,
  style,
  onPress,
  icon,
  block = false,
  accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const iconSize = variant === 'primary' || variant === 'ghost' ? 15 : 13;

  return (
    <TouchableOpacity
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof children === 'string' ? children : undefined)}
      activeOpacity={0.85}
      style={[
        containerByVariant[variant],
        block && styles.block,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? theme.colors.white : theme.colors.mint[600]}
        />
      ) : (
        <View style={styles.inner}>
          {icon ? <Icon name={icon} size={iconSize} color={iconColorByVariant[variant]} /> : null}
          <Text style={textByVariant[variant]}>{children}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/** Square, bordered icon button used in toolbars and table rows. */
export function IconButton({
  icon,
  onPress,
  label,
  size = 36,
  iconSize = 17,
  color = theme.colors.ink[500],
  variant = 'ghost',
  disabled = false,
  style,
}: {
  icon: IconName;
  onPress?: () => void;
  label: string;
  size?: number;
  iconSize?: number;
  color?: string;
  variant?: 'ghost' | 'danger' | 'mint';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = {
    ghost: {
      borderColor: theme.colors.line,
      backgroundColor: theme.colors.white,
    },
    danger: {
      borderColor: theme.colors.rose[200],
      backgroundColor: theme.colors.rose[50],
    },
    mint: {
      borderColor: theme.colors.mint[200],
      backgroundColor: theme.colors.mint[50],
    },
  }[variant];

  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.8}
      style={[
        styles.iconButton,
        palette,
        { width: size, height: size },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Icon name={icon} size={iconSize} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2],
  },
  block: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
  },
});
