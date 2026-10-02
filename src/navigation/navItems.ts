import type { IconName } from '../components/Icon';
import type { Role } from '../types/api';

export interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  /**
   * Roles allowed to see and open this page.
   *
   * Derived from the backend's own authorization, not from preference:
   *   - Admin-only pages are backed by `api/admin/*`, `api/AuditLogs` and
   *     `api/reports/*`, which carry a class-level `[Authorize(Roles = "Admin")]`.
   *   - Attendance / Examinations / Communicate are backed by endpoints
   *     restricted to Admin,Teacher (or readable by everyone, written by staff).
   *   - Timetable and Events are readable by any signed-in user.
   */
  roles: Role[];
  /**
   * Reachable but not listed in the drawer. The profile page is opened from the
   * top-bar avatar, so it must still pass {@link canAccess}.
   */
  hidden?: boolean;
}

const ALL: Role[] = ['Admin', 'Teacher', 'Student', 'Parent'];
const STAFF: Role[] = ['Admin', 'Teacher'];
const ADMIN_ONLY: Role[] = ['Admin'];
/** Staff set the work, learners see and respond to it. */
const STAFF_AND_STUDENT: Role[] = ['Admin', 'Teacher', 'Student'];

/**
 * Drawer items — each backed by a real backend controller.
 *   overview    → PortalsController (+ AdminDashboardController)
 *   students    → StudentsController
 *   teachers    → TeachersController + AdminManagementController
 *   academics   → AcademicController
 *   timetable   → SchoolExtensionsController
 *   attendance  → AttendanceController
 *   exams       → ExamsController
 *   assignments → AssignmentsController
 *   fees        → FeesController + ReportsController
 *   communicate → AnnouncementsController + Notifications
 *   events      → SchoolExtensionsController
 *   reports     → ReportsController
 *   audit-logs  → AuditLogsController
 */
export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'School Overview', icon: 'school', roles: ALL },
  { id: 'students', label: 'Student Info', icon: 'student', roles: STAFF },
  { id: 'teachers', label: 'Teachers', icon: 'teachers', roles: ADMIN_ONLY },
  { id: 'academics', label: 'Academics', icon: 'library', roles: STAFF },
  { id: 'timetable', label: 'Timetable', icon: 'calendarDays', roles: ALL },
  { id: 'attendance', label: 'Attendance', icon: 'clipboardCheck', roles: ALL },
  { id: 'exams', label: 'Examinations', icon: 'scrollText', roles: STAFF_AND_STUDENT },
  { id: 'assignments', label: 'Assignments', icon: 'fileText', roles: STAFF_AND_STUDENT },
  { id: 'fees', label: 'Fees Collection', icon: 'wallet', roles: ADMIN_ONLY },
  { id: 'communicate', label: 'Communicate', icon: 'chat', roles: ALL },
  { id: 'events', label: 'Events', icon: 'events', roles: ALL },
  { id: 'reports', label: 'Reports', icon: 'stats', roles: ADMIN_ONLY },
  { id: 'audit-logs', label: 'Audit Logs', icon: 'history', roles: ADMIN_ONLY },

  // Not in the drawer: opened from the avatar button in the top bar.
  { id: 'profile', label: 'My Profile', icon: 'profile', roles: ALL, hidden: true },
];

export const DEFAULT_NAV_ID = 'overview';

/** Narrow an unknown/empty role to a safe default so nothing is over-exposed. */
export function normalizeRole(role: string | undefined | null): Role {
  return role === 'Admin' || role === 'Teacher' || role === 'Student' || role === 'Parent'
    ? role
    : 'Student';
}

/** The nav items a role is allowed to see, in display order. */
export function navItemsForRole(role: string | undefined | null): NavItem[] {
  const r = normalizeRole(role);
  return NAV_ITEMS.filter((item) => !item.hidden && item.roles.includes(r));
}

export function findNavItem(id: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.id === id);
}

/**
 * True when a role may open a page. Hidden items (the profile page) are included
 * here: they are reachable, just not listed in the drawer.
 */
export function canAccess(role: string | undefined | null, id: string): boolean {
  const r = normalizeRole(role);
  return NAV_ITEMS.some((item) => item.id === id && item.roles.includes(r));
}
