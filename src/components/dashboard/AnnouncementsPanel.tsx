import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import type { Announcement } from '../../api/announcements';
import { theme } from '../../theme';
import { Card } from '../common/Card';
import { Skeleton } from '../common/Skeleton';

/** "Announcements" panel; shows the first four items exactly like the website. */
export function AnnouncementsPanel({
  items,
  loading,
  limit = 4,
  style,
}: {
  items: Announcement[];
  loading: boolean;
  limit?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Card style={style}>
      <Text style={styles.title}>Announcements</Text>

      {loading ? (
        <View style={styles.skeletonStack}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={64} />
          ))}
        </View>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>No announcements yet.</Text>
      ) : (
        <View style={styles.list}>
          {items.slice(0, limit).map((item) => (
            <View key={item.Id} style={styles.item}>
              <View style={styles.itemHead}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.Title}
                </Text>
                <View style={styles.rolePill}>
                  <Text style={styles.roleText}>{item.TargetRole}</Text>
                </View>
              </View>
              <Text style={styles.itemBody} numberOfLines={2}>
                {item.Content}
              </Text>
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
    gap: theme.spacing[3],
  },
  item: {
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.lineSoft,
    padding: theme.spacing[3.5],
  },
  itemHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing[2],
  },
  itemTitle: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[900],
  },
  rolePill: {
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[0.5],
  },
  roleText: {
    fontSize: theme.fontSize.micro,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.ink[500],
  },
  itemBody: {
    marginTop: theme.spacing[1],
    fontSize: theme.fontSize.xs,
    color: theme.colors.ink[500],
  },
});
