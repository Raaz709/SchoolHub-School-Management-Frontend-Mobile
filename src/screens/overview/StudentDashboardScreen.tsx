import React from 'react';
import { StyleSheet, View } from 'react-native';
import { fetchStudentDashboard } from '../../api/portals';
import { fetchAnnouncements } from '../../api/announcements';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard, StatGrid } from '../../components/dashboard/StatCard';
import { AnnouncementsPanel } from '../../components/dashboard/AnnouncementsPanel';
import { ErrorState } from '../../components/common/ErrorState';
import { Screen } from '../../components/common/Screen';
import { Skeleton } from '../../components/common/Skeleton';
import { theme } from '../../theme';

/** Student home page — the website's `StudentDashboard`. */
export function StudentDashboardScreen() {
  const { user, signOut } = useAuth();
  const stats = useAsync((signal) => fetchStudentDashboard(signal));
  const news = useAsync((signal) => fetchAnnouncements(signal));

  const onRefresh = () => {
    void stats.refetch();
    void news.refetch();
  };

  if (stats.error) {
    return (
      <Screen onRefresh={onRefresh} refreshing={stats.loading}>
        <PageHeader title="My Dashboard" subtitle="Your school at a glance." />
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
      <PageHeader
        title={`Welcome, ${user?.username ?? 'Student'}`}
        subtitle="Your school at a glance."
      />

      <StatGrid>
        {stats.loading || !data ? (
          [0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={132} borderRadius={theme.borderRadius['2xl']} style={styles.skeletonCard} />
          ))
        ) : (
          <>
            <StatCard
              label="Attendance"
              value={`${Math.round(data.AttendancePercentage)}%`}
              icon="clipboardCheck"
              tone="green"
              hint="Overall attendance"
            />
            <StatCard
              label="Pending Assignments"
              value={data.PendingAssignments}
              icon="bookOpen"
              tone="amber"
            />
            <StatCard label="Upcoming Exam" value={data.UpcomingExam} icon="calendar" tone="blue" />
            <StatCard
              label="Unread Notifications"
              value={data.UnreadNotifications}
              icon="bell"
              tone="violet"
            />
          </>
        )}
      </StatGrid>

      <View style={styles.panels}>
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
  panels: {
    marginTop: theme.spacing[6],
  },
});
