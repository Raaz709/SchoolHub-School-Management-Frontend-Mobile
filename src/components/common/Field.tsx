import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { theme } from '../../theme';

/** `label / value` pair used by every detail drawer and profile panel. */
export function Field({
  label,
  value,
  style,
}: {
  label: string;
  value: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={styles.value}>{value === '' ? '—' : String(value)}</Text>
      ) : (
        value
      )}
    </View>
  );
}

/** Two-column field grid; each cell keeps at least 150dp before wrapping. */
export function FieldGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

/** Section heading inside a detail panel. */
export function FieldSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

/** Horizontal action bar used at the bottom of detail panels. */
export function ActionBar({ children }: { children: React.ReactNode }) {
  return <View style={styles.actionBar}>{children}</View>;
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    minWidth: '45%',
    gap: theme.spacing[1],
  },
  label: {
    fontSize: theme.fontSize.tiny,
    fontWeight: theme.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: theme.colors.ink[500],
  },
  value: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.ink[900],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[4],
  },
  section: {
    gap: theme.spacing[3],
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[700],
  },
  actionBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: theme.spacing[2],
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    paddingTop: theme.spacing[4],
    marginTop: theme.spacing[5],
  },
});
