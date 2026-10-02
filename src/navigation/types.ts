/** Every navigable page id, matching `navItems.ts`. */
export type RouteId =
  | 'overview'
  | 'students'
  | 'teachers'
  | 'academics'
  | 'timetable'
  | 'attendance'
  | 'exams'
  | 'assignments'
  | 'fees'
  | 'communicate'
  | 'events'
  | 'reports'
  | 'audit-logs'
  | 'profile';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};
