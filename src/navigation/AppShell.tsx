import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { canAccess, findNavItem } from './navItems';
import { NavigationProvider, useAppNavigation } from './NavigationContext';
import type { RouteId } from './types';
import { Drawer } from '../components/layout/Drawer';
import { TopBar } from '../components/layout/TopBar';
import { ComingSoon } from '../components/common/ComingSoon';
import { theme } from '../theme';

import { OverviewScreen } from '../screens/overview/OverviewScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { StudentsScreen } from '../screens/students/StudentsScreen';
import { TeachersScreen } from '../screens/teachers/TeachersScreen';
import { AcademicsScreen } from '../screens/academics/AcademicsScreen';
import { TimetableScreen } from '../screens/timetable/TimetableScreen';
import { AttendanceScreen } from '../screens/attendance/AttendanceScreen';
import { ExamsScreen } from '../screens/exams/ExamsScreen';
import { AssignmentsScreen } from '../screens/assignments/AssignmentsScreen';
import { FeesScreen } from '../screens/fees/FeesScreen';
import { CommunicateScreen } from '../screens/communicate/CommunicateScreen';
import { EventsScreen } from '../screens/events/EventsScreen';
import { ReportsScreen } from '../screens/reports/ReportsScreen';
import { AuditLogsScreen } from '../screens/auditLogs/AuditLogsScreen';

/**
 * Route table mapping each drawer id to its screen. Every route in `RouteId` is
 * implemented; `ComingSoon` remains only as a guard so an unrecognised id can
 * never render a blank page.
 */
const SCREENS: Partial<Record<RouteId, React.ComponentType>> = {
  overview: OverviewScreen,
  students: StudentsScreen,
  teachers: TeachersScreen,
  academics: AcademicsScreen,
  timetable: TimetableScreen,
  attendance: AttendanceScreen,
  exams: ExamsScreen,
  assignments: AssignmentsScreen,
  fees: FeesScreen,
  communicate: CommunicateScreen,
  events: EventsScreen,
  reports: ReportsScreen,
  'audit-logs': AuditLogsScreen,
  profile: ProfileScreen,
};

function ActiveScreen() {
  const { activeId } = useAppNavigation();
  const { user } = useAuth();

  // A stale id (e.g. after signing in as a lower-privileged role) must never
  // render a page the role cannot access.
  if (!canAccess(user?.role, activeId)) {
    const FallbackScreen = SCREENS.overview;
    return FallbackScreen ? <FallbackScreen /> : null;
  }

  const Screen = SCREENS[activeId];
  if (Screen) return <Screen />;

  const item = findNavItem(activeId);
  return <ComingSoon title={item?.label ?? 'Not available'} icon={item?.icon ?? 'info'} />;
}

/** Top bar + drawer + the active page. Mirrors the web `AppLayout`. */
function Shell() {
  return (
    <View style={styles.shell}>
      <TopBar />
      <View style={styles.content}>
        <ActiveScreen />
      </View>
      <Drawer />
    </View>
  );
}

export function AppShell() {
  return (
    <NavigationProvider>
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <Shell />
      </SafeAreaView>
    </NavigationProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  shell: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  content: {
    flex: 1,
  },
});
