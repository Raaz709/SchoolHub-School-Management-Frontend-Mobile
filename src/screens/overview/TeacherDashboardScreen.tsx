import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fetchTeacherClasses, fetchTeacherSubjects } from '../../api/teacher';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard, StatGrid } from '../../components/dashboard/StatCard';
import { ErrorState } from '../../components/common/ErrorState';
import { Screen } from '../../components/common/Screen';
import { Card } from '../../components/common/Card';
import { Skeleton } from '../../components/common/Skeleton';
import { theme } from '../../theme';

/** Teacher home page — the website's `TeacherDashboard`. */
export function TeacherDashboardScreen() {
  const { user, signOut } = useAuth();
  const classes = useAsync((signal) => fetchTeacherClasses(signal));
  const subjects = useAsync((signal) => fetchTeacherSubjects(signal));

  const onRefresh = () => {
    void classes.refetch();
    void subjects.refetch();
  };

  if (classes.error || subjects.error) {
    const err = classes.error ?? subjects.error;
    return (
      <Screen onRefresh={onRefresh} refreshing={classes.loading || subjects.loading}>
        <PageHeader title="My Dashboard" subtitle="Your teaching overview." />
        <ErrorState
          message={err!.message}
          status={classes.status ?? subjects.status}
          onRetry={onRefresh}
          onSignIn={signOut}
        />
      </Screen>
    );
  }

  const classList = classes.data ?? [];

  return (
    <Screen onRefresh={onRefresh} refreshing={classes.loading || subjects.loading}>
      <PageHeader
        title={`Welcome, ${user?.username ?? 'Teacher'}`}
        subtitle="Your teaching overview."
      />

      <StatGrid>
        {classes.loading || subjects.loading ? (
          [0, 1].map((i) => (
            <Skeleton key={i} height={132} borderRadius={theme.borderRadius['2xl']} style={styles.skeletonCard} />
          ))
        ) : (
          <>
            <StatCard label="My Classes" value={classList.length} icon="teachers" tone="blue" />
            <StatCard
              label="My Subjects"
              value={subjects.data?.length ?? 0}
              icon="bookOpen"
              tone="green"
            />
          </>
        )}
      </StatGrid>

      {!classes.loading && classList.length > 0 ? (
        <Card style={styles.classList}>
          <Text style={styles.cardTitle}>My Classes</Text>
          {classList.map((item, index) => (
            <View key={item.Id} style={[styles.classRow, index > 0 && styles.classRowDivided]}>
              <Text style={styles.className}>{item.Name}</Text>
              <Text style={styles.classMeta}>Section {item.SectionName}</Text>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  skeletonCard: {
    flex: 1,
    minWidth: '47%',
  },
  classList: {
    marginTop: theme.spacing[6],
  },
  cardTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[900],
    marginBottom: theme.spacing[3],
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[2.5],
  },
  classRowDivided: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
  },
  className: {
    flex: 1,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.ink[900],
  },
  classMeta: {
    fontSize: theme.fontSize.base,
    color: theme.colors.ink[500],
  },
});
