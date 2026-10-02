import { apiGet } from './client';

/** Mirrors `AdminDashboardController.GetDashboardStats`. */
export interface ActivityItem {
  Action: string;
  Details: string | null;
  /** Timestamptz: an ISO-8601 instant. */
  CreatedAt: string;
}

export interface DashboardStats {
  TotalStudents: number;
  TotalTeachers: number;
  TotalParents: number;
  TotalClasses: number;
  TodaysAttendance: number;
  UpcomingExams: number;
  RecentAnnouncementsCount: number;
  RecentActivity: ActivityItem[];
}

export function fetchDashboardStats(signal?: AbortSignal): Promise<DashboardStats> {
  return apiGet<DashboardStats>('/api/admin/dashboard/stats', signal);
}
