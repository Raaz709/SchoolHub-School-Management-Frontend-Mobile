import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { normalizeRole } from '../../navigation/navItems';
import { SchoolOverviewScreen } from './SchoolOverviewScreen';
import { TeacherDashboardScreen } from './TeacherDashboardScreen';
import { StudentDashboardScreen } from './StudentDashboardScreen';
import { ParentDashboardScreen } from './ParentDashboardScreen';

/**
 * The web app routes `/overview` to a different page per role. `ActiveScreen`
 * already guards access, so this only has to pick the right dashboard.
 */
export function OverviewScreen() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);

  return (
    <View style={styles.flex}>
      {role === 'Admin' ? (
        <SchoolOverviewScreen />
      ) : role === 'Teacher' ? (
        <TeacherDashboardScreen />
      ) : role === 'Parent' ? (
        <ParentDashboardScreen />
      ) : (
        <StudentDashboardScreen />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
