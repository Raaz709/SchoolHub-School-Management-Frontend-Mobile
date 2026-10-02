import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import type { ActivityItem } from '../../api/dashboard';
import { theme } from '../../theme';
import { timeAgo } from '../../lib/format';
import { Card } from '../common/Card';
import { Skeleton } from '../common/Skeleton';

/** "Recent Activity" panel from the admin overview. */
export function ActivityPanel({
  items,
  loading,
  style,
}: {
  items: ActivityItem[];
  loading: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Card style={style}>
      <Text style={styles.title}>Recent Activity</Text>

      {loading ? (
        <View style={styles.skeletonStack}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={40} />
          ))}
        </View>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>No activity recorded yet.</Text>
      ) : (
        <View style={styles.list}>
          {items.map((item, index) => (
            <View key={`${item.Action}-${index}`} style={[styles.row, index > 0 && styles.rowDivided]}>
              <View style={styles.rowText}>
                <Text style={styles.action} numberOfLines={1}>
                  {item.Action}
                </Text>
                <Text style={styles.details} numberOfLines={1}>
                  {item.Details ?? '-'}
                </Text>
              </View>
              <Text style={styles.when}>{timeAgo(item.CreatedAt)}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[900],
  },
  skeletonStack: {
    marginTop: theme.spacing[4],
    gap: theme.spacing[3],
  },
  empty: {
    marginTop: theme.spacing[4],
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink[500],
  },
  list: {
    marginTop: theme.spacing[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[2.5],
  },
  rowDivided: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  action: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[900],
  },
  details: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.ink[500],
    marginTop: 2,
  },
  when: {
    fontSize: theme.fontSize.tiny,
    color: theme.colors.ink[400],
  },
});
