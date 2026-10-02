import React from 'react';
import { View, StyleSheet } from 'react-native';
import { fetchDashboardStats } from '../../api/dashboard';
import { fetchAnnouncements } from '../../api/announcements';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard, StatGrid } from '../../components/dashboard/StatCard';
import { ActivityPanel } from '../../components/dashboard/ActivityPanel';
import { AnnouncementsPanel } from '../../components/dashboard/AnnouncementsPanel';
import { ErrorState } from '../../components/common/ErrorState';
import { Screen } from '../../components/common/Screen';
import { Skeleton } from '../../components/common/Skeleton';
import { theme } from '../../theme';

/** Admin home page — the website's `SchoolOverview`. */
export function SchoolOverviewScreen() {
  const { signOut } = useAuth();
  const stats = useAsync((signal) => fetchDashboardStats(signal));
  const news = useAsync((signal) => fetchAnnouncements(signal));

  const onRefresh = () => {
    void stats.refetch();
    void news.refetch();
  };

  if (stats.error) {
    return (
      <Screen onRefresh={onRefresh} refreshing={stats.loading}>
        <PageHeader title="School Overview" subtitle="Live data from the SchoolHub API." />
        <ErrorState
          message={stats.error.message}
          status={stats.status}
          onRetry={onRefresh}
          onSignIn={signOut}
        />
      </Screen>
    );
  }

  const data = stats.data;

  return (
    <Screen onRefresh={onRefresh} refreshing={stats.loading}>
      <PageHeader title="School Overview" subtitle="Live data from the SchoolHub API." />

      <StatGrid>
        {stats.loading || !data ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} height={132} borderRadius={theme.borderRadius['2xl']} style={styles.skeletonCard} />)
        ) : (
          <>
            <StatCard label="Total Students" value={data.TotalStudents} icon="student" tone="green" />
            <StatCard label="Total Teachers" value={data.TotalTeachers} icon="teachers" tone="blue" />
            <StatCard label="Total Parents" value={data.TotalParents} icon="users" tone="violet" />
            <StatCard label="Total Classes" value={data.TotalClasses} icon="building" tone="sky" />
          </>
        )}
      </StatGrid>

      <View style={styles.spacer} />

      <StatGrid>
        {stats.loading || !data ? (
          [0, 1, 2].map((i) => <Skeleton key={i} height={132} borderRadius={theme.borderRadius['2xl']} style={styles.skeletonCard} />)
        ) : (
          <>
            <StatCard
              label="Present Today"
              value={data.TodaysAttendance}
              icon="bookOpen"
              tone="green"
              hint="Attendance marked today"
            />
            <StatCard label="Upcoming Exams" value={data.UpcomingExams} icon="scrollText" tone="amber" />
            <StatCard
              label="Announcements"
              value={data.RecentAnnouncementsCount}
              icon="bell"
              tone="rose"
            />
          </>
        )}
      </StatGrid>

      <View style={styles.panels}>
        <ActivityPanel items={data?.RecentActivity ?? []} loading={stats.loading} />
        <AnnouncementsPanel items={news.data ?? []} loading={news.loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  skeletonCard: {
    flex: 1,
    minWidth: '47%',
  },
  spacer: {
    height: theme.spacing[4],
  },
  panels: {
    marginTop: theme.spacing[6],
    gap: theme.spacing[6],
  },
});
