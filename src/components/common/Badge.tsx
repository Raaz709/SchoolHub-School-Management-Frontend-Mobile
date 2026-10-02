import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, theme } from '../../theme';

export type BadgeTone = 'neutral' | 'mint' | 'rose' | 'amber' | 'blue' | 'violet' | 'sky';

const TONES: Record<BadgeTone, { bg: string; text: string }> = {
  neutral: { bg: colors.lineSoft, text: colors.ink[700] },
  mint: { bg: colors.mint[50], text: colors.mint[700] },
  rose: { bg: colors.rose[50], text: colors.rose[600] },
  amber: { bg: colors.amber[50], text: colors.amber[500] },
  blue: { bg: colors.blue[50], text: colors.blue[500] },
  violet: { bg: colors.violet[50], text: colors.violet[500] },
  sky: { bg: colors.sky[50], text: colors.sky[500] },
};

/** Rounded status pill, the equivalent of the site's `rounded-full px-2.5 py-0.5`. */
export function Badge({
  label,
  tone = 'neutral',
  style,
}: {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }, style]}>
      <Text style={[styles.text, { color: palette.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Maps a domain status word to its badge tone, consistently across modules. */
export function statusTone(status: string): BadgeTone {
  const value = status.toLowerCase();
  if (['active', 'present', 'paid', 'approved', 'graded', 'published', 'yes', 'completed'].includes(value)) {
    return 'mint';
  }
  if (['inactive', 'absent', 'overdue', 'rejected', 'failed', 'no', 'cancelled'].includes(value)) {
    return 'rose';
  }
  if (['pending', 'late', 'partial', 'draft', 'submitted'].includes(value)) {
    return 'amber';
  }
  return 'neutral';
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing[2.5],
    paddingVertical: theme.spacing[0.5],
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: theme.fontSize.tiny,
    fontWeight: theme.fontWeight.medium,
  },
});
