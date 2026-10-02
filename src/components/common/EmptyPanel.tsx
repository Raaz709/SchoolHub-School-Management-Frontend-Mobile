import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { commonStyles, theme } from '../../theme';
import { Icon, type IconName } from '../Icon';

interface EmptyPanelProps {
  /** Matches the website's `<EmptyPanel message="…" />`. */
  message?: string;
  title?: string;
  subtitle?: string;
  icon?: IconName;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

/**
 * The dashed "nothing here yet" panel from the web client, with an optional icon
 * for the mobile screens that have room for one.
 */
export function EmptyPanel({
  message,
  title,
  subtitle,
  icon,
  action,
  style,
  compact = false,
}: EmptyPanelProps) {
  const heading = title ?? message ?? 'Nothing to show';

  return (
    <View
      style={[
        commonStyles.dashedPanel,
        compact ? styles.compact : null,
        action ? styles.withAction : null,
        style,
      ]}
    >
      {icon ? (
        <View style={styles.iconTile}>
          <Icon name={icon} size={22} color={theme.colors.ink[400]} />
        </View>
      ) : null}
      <Text style={title ? styles.title : commonStyles.emptyStateText}>{heading}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  compact: {
    paddingVertical: theme.spacing[6],
  },
  withAction: {
    paddingVertical: theme.spacing[8],
  },
  iconTile: {
    marginBottom: theme.spacing[3],
  },
  title: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.ink[700],
    textAlign: 'center',
  },
  subtitle: {
    marginTop: theme.spacing[1],
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink[500],
    textAlign: 'center',
  },
  action: {
    marginTop: theme.spacing[5],
  },
});
