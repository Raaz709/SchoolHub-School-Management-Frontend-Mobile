import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { theme } from '../../theme';
import { Icon, type IconName } from '../Icon';

export type BannerTone = 'success' | 'error' | 'info' | 'warning';

const TONES: Record<BannerTone, { bg: string; fg: string; border: string; icon: IconName }> = {
  success: {
    bg: theme.colors.mint[50],
    fg: theme.colors.mint[700],
    border: theme.colors.mint[200],
    icon: 'checkCircle',
  },
  error: {
    bg: theme.colors.rose[50],
    fg: theme.colors.rose[600],
    border: theme.colors.rose[200],
    icon: 'alertCircle',
  },
  info: {
    bg: theme.colors.blue[50],
    fg: theme.colors.blue[500],
    border: theme.colors.blue[200],
    icon: 'info',
  },
  warning: {
    bg: theme.colors.amber[50],
    fg: theme.colors.amber[500],
    border: theme.colors.amber[200],
    icon: 'alertTriangle',
  },
};

/**
 * Inline feedback strip. Replaces the website's toast: mobile modals can be
 * dismissed before a toast is read, so the message stays in the panel instead.
 */
export function Banner({
  tone,
  message,
  style,
}: {
  tone: BannerTone;
  message: string;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = TONES[tone];

  return (
    <View
      style={[styles.banner, { backgroundColor: palette.bg, borderColor: palette.border }, style]}
    >
      <Icon name={palette.icon} size={15} color={palette.fg} />
      <Text style={[styles.text, { color: palette.fg }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[2],
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2.5],
  },
  text: {
    flex: 1,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    lineHeight: theme.fontSize.xs * theme.lineHeight.normal,
  },
});
