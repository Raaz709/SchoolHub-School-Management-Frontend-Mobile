import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { Icon, type IconName } from '../Icon';
import { Screen } from '../common/Screen';
import { PageHeader } from '../layout/PageHeader';

/**
 * Placeholder shown for a nav destination that exists on the website but has
 * not been ported to mobile yet. Keeps the drawer navigable while the remaining
 * modules land, instead of dead-ending on a broken route.
 */
export function ComingSoon({ title, icon }: { title: string; icon: IconName }) {
  return (
    <Screen>
      <PageHeader title={title} subtitle="This module is still being ported to mobile." />
      <View style={styles.panel}>
        <View style={styles.tile}>
          <Icon name={icon} size={22} color={theme.colors.ink[400]} />
        </View>
        <Text style={styles.title}>{title} is not available in the mobile app yet</Text>
        <Text style={styles.body}>
          The backend endpoints are already wired up. This screen will be delivered in a
          following step of the mobile build-out.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: theme.borderRadius['2xl'],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[16],
    alignItems: 'center',
  },
  tile: {
    marginBottom: theme.spacing[3],
  },
  title: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.ink[700],
    textAlign: 'center',
  },
  body: {
    marginTop: theme.spacing[1],
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink[500],
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: theme.fontSize.sm * theme.lineHeight.normal,
  },
});
