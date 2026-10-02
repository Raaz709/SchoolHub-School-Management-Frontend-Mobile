import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fetchParentChildren } from '../../api/portals';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { ErrorState } from '../../components/common/ErrorState';
import { Screen } from '../../components/common/Screen';
import { Card } from '../../components/common/Card';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyPanel } from '../../components/common/EmptyPanel';
import { Icon } from '../../components/Icon';
import { theme } from '../../theme';

/** Parent home page — the website's `ParentDashboard`. */
export function ParentDashboardScreen() {
  const { user, signOut } = useAuth();
  const children = useAsync((signal) => fetchParentChildren(signal));

  const onRefresh = () => {
    void children.refetch();
  };

  if (children.error) {
    return (
      <Screen onRefresh={onRefresh} refreshing={children.loading}>
        <PageHeader title="My Children" subtitle="Your family's school overview." />
        <ErrorState
          message={children.error.message}
          status={children.status}
          onRetry={onRefresh}
          onSignIn={signOut}
        />
      </Screen>
    );
  }

  const kids = children.data ?? [];

  return (
    <Screen onRefresh={onRefresh} refreshing={children.loading}>
      <PageHeader
        title={`Welcome, ${user?.username ?? 'Parent'}`}
        subtitle={`${kids.length} child${kids.length === 1 ? '' : 'ren'} linked to your account`}
      />

      {children.loading ? (
        <View style={styles.grid}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={140} borderRadius={theme.borderRadius['2xl']} style={styles.skeletonCard} />
          ))}
        </View>
      ) : kids.length === 0 ? (
        <EmptyPanel
          icon="student"
          message="No children linked to your account yet."
        />
      ) : (
        <View style={styles.grid}>
          {kids.map((child) => (
            <Card key={child.StudentId} style={styles.childCard}>
              <View style={styles.childTile}>
                <Icon name="schoolSolid" size={20} color={theme.colors.mint[600]} />
              </View>
              <Text style={styles.childName}>{child.StudentName}</Text>
              <Text style={styles.childRoll}>Roll No {child.RollNumber}</Text>
              <View style={styles.pillRow}>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{child.ClassName ?? 'No class'}</Text>
                </View>
                {child.SectionName ? (
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>Section {child.SectionName}</Text>
                  </View>
                ) : null}
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[4],
  },
  skeletonCard: {
    flex: 1,
    minWidth: '47%',
  },
  childCard: {
    flex: 1,
    minWidth: '47%',
  },
  childTile: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.mint[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  childName: {
    marginTop: theme.spacing[3.5],
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.ink[900],
  },
  childRoll: {
    marginTop: theme.spacing[0.5],
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink[500],
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
    marginTop: theme.spacing[3],
  },
  pill: {
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.lineSoft,
    paddingHorizontal: theme.spacing[2.5],
    paddingVertical: theme.spacing[0.5],
  },
  pillText: {
    fontSize: theme.fontSize.tiny,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.ink[700],
  },
});
