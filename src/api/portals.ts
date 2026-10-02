import { apiGet } from './client';
import { pick, toNumber, toStringValue } from '../types/api';

export interface StudentDashboard {
  AttendancePercentage: number;
  PendingAssignments: number;
  UpcomingExam: string;
  UnreadNotifications: number;
}

export interface Child {
  StudentId: number;
  RollNumber: string;
  StudentName: string;
  ClassName: string | null;
  SectionName: string | null;
}

/** GET /api/portals/student/dashboard — tolerant of PascalCase/camelCase. */
export async function fetchStudentDashboard(signal?: AbortSignal): Promise<StudentDashboard> {
  const raw = await apiGet<Record<string, unknown>>('/api/portals/student/dashboard', signal);

  return {
    AttendancePercentage: toNumber(pick(raw, 'AttendancePercentage'), 100),
    PendingAssignments: toNumber(pick(raw, 'PendingAssignments')),
    UpcomingExam: toStringValue(pick(raw, 'UpcomingExam'), 'None scheduled'),
    UnreadNotifications: toNumber(pick(raw, 'UnreadNotifications')),
  };
}

/** GET /api/portals/parent/children */
export async function fetchParentChildren(signal?: AbortSignal): Promise<Child[]> {
  const rows = await apiGet<Record<string, unknown>[]>('/api/portals/parent/children', signal);

  return (rows ?? []).map((row) => ({
    StudentId: toNumber(pick(row, 'StudentId')),
    RollNumber: toStringValue(pick(row, 'RollNumber')),
    StudentName: toStringValue(pick(row, 'StudentName')),
    ClassName: (pick(row, 'ClassName') as string | null) ?? null,
    SectionName: (pick(row, 'SectionName') as string | null) ?? null,
  }));
}
