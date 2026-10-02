import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { statCardTones, theme, type StatTone } from '../../theme';
import { Icon, type IconName } from '../Icon';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: IconName;
  tone: StatTone;
  hint?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Mirrors the website's `StatCard`: a 40px tone-tinted icon tile, a small muted
 * label, then the value in bold.
 */
export function StatCard({ label, value, icon, tone, hint, style }: StatCardProps) {
  const palette = statCardTones[tone];
  const display = typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <View style={[styles.card, style]}>
      <View style={[styles.tile, { backgroundColor: palette.tile }]}>
        <Icon name={icon} size={20} color={palette.icon} />
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {display}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius['2xl'],
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: theme.spacing[5],
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: theme.spacing[3.5],
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.ink[500],
  },
  value: {
    marginTop: theme.spacing[0.5],
    fontSize: theme.fontSize['5xl'],
    fontWeight: theme.fontWeight.bold,
    letterSpacing: -0.4,
    color: theme.colors.ink[900],
  },
  hint: {
    marginTop: theme.spacing[1],
    fontSize: theme.fontSize.tiny,
    color: theme.colors.ink[400],
  },
});

/** Responsive wrapper: two stat cards per row on a phone-width screen. */
export function StatGrid({ children }: { children: React.ReactNode }) {
  return <View style={gridStyles.grid}>{children}</View>;
}

const gridStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[4],
  },
});
