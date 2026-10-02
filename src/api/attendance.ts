import { apiGet, apiPost, apiPut, buildQuery } from './client';

/** The only statuses the API accepts; anything else is rejected server-side. */
export const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Excused'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export interface AttendanceSession {
  Id: number;
  Date: string;
  ClassId: number;
  SectionId: number;
  /** Null when an administrator marked the session: admins have no Teachers row. */
  TeacherId: number | null;
  ClassName: string;
  SectionName: string;
  TeacherName: string | null;
  /** Records that are not "Absent" — the API counts this in one pass. */
  Marked: number;
  Total: number;
}

export interface AttendanceRecord {
  Id: number;
  StudentId: number;
  Status: string;
  Remarks: string;
  RollNumber: string;
  Username: string;
}

export interface AttendanceSessionDetail {
  Session: {
    Id: number;
    Date: string;
    ClassId: number;
    SectionId: number;
    TeacherId: number | null;
    ClassName: string;
    SectionName: string;
  };
  Records: AttendanceRecord[];
}

/** One row of the marking sheet. `Status` is null when not yet decided. */
export interface RosterStudent {
  StudentId: number;
  RollNumber: string;
  Username: string;
  RecordId: number | null;
  Status: string | null;
  Remarks: string | null;
}

export interface AttendanceRoster {
  ClassId: number;
  SectionId: number;
  Date: string;
  Students: RosterStudent[];
}

/** A learner's own attendance, with class and section labels attached. */
export interface StudentAttendanceRow {
  Id: number;
  Status: string;
  Remarks: string | null;
  SessionId: number;
  Date: string;
  ClassId: number | null;
  ClassName: string | null;
  SectionName: string | null;
}

export interface AttendanceRecordPayload {
  StudentId: number;
  Status: string;
  Remarks: string;
}

export interface AttendanceSessionPayload {
  ClassId: number;
  SectionId: number;
  Date: string;
  Records: AttendanceRecordPayload[];
}

export interface SessionFilters {
  classId?: number | null;
  sectionId?: number | null;
  /** `YYYY-MM-DD`; the API casts the parameter to `date`. */
  from?: string | null;
  to?: string | null;
}

/** Staff only. */
export function fetchSessions(
  filters: SessionFilters = {},
  signal?: AbortSignal,
): Promise<AttendanceSession[]> {
  return apiGet<AttendanceSession[]>(
    `/api/attendance/sessions${buildQuery({
      classId: filters.classId,
      sectionId: filters.sectionId,
      from: filters.from,
      to: filters.to,
    })}`,
    signal,
  );
}

/** Staff only. Includes every record, so a past marking can be corrected. */
export function fetchSession(
  id: number,
  signal?: AbortSignal,
): Promise<AttendanceSessionDetail> {
  return apiGet<AttendanceSessionDetail>(`/api/attendance/sessions/${id}`, signal);
}

/**
 * The students to mark. Any decision already stored for that date comes back
 * pre-filled, so re-opening the sheet never loses marks.
 */
export function fetchRoster(
  classId: number,
  sectionId: number,
  date: string,
  signal?: AbortSignal,
): Promise<AttendanceRoster> {
  return apiGet<AttendanceRoster>(
    `/api/attendance/roster${buildQuery({ classId, sectionId, date })}`,
    signal,
  );
}

/** Students only — resolves the student id from the caller's token. */
export function fetchMyAttendance(signal?: AbortSignal): Promise<StudentAttendanceRow[]> {
  return apiGet<StudentAttendanceRow[]>('/api/attendance/mine', signal);
}

/** Admin and Teacher may read any student; a parent only a linked child. */
export function fetchStudentAttendance(
  studentId: number,
  signal?: AbortSignal,
): Promise<StudentAttendanceRow[]> {
  return apiGet<StudentAttendanceRow[]>(`/api/attendance/student/${studentId}`, signal);
}

/** Refuses with 409 when the section was already marked on that date. */
export function createSession(
  payload: AttendanceSessionPayload,
  signal?: AbortSignal,
): Promise<{ Message: string; SessionId: number }> {
  return apiPost('/api/attendance/session', payload, signal);
}

/** Replaces every mark on the session, matching records by student id. */
export function updateSession(
  id: number,
  payload: AttendanceSessionPayload,
  signal?: AbortSignal,
): Promise<{ Message: string }> {
  return apiPut(`/api/attendance/sessions/${id}`, payload, signal);
}
