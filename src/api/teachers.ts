import { apiGet, apiPatch, apiPost, apiPut } from './client';

/**
 * Row shape from `GET /api/admin/teachers` — the only teacher endpoint that
 * includes `IsActive`, so it is the one the management UI reads.
 */
export interface Teacher {
  Id: number;
  EmployeeCode: string;
  HireDate: string | null;
  /** Null when the teacher has no department, or the department was removed. */
  DepartmentId: number | null;
  DepartmentName: string | null;
  UserId: number;
  Username: string;
  Email: string;
  IsActive: boolean;
}

export interface UpdateTeacherPayload {
  DepartmentId: number;
  EmployeeCode: string;
}

export interface CreateTeacherPayload {
  Username: string;
  Email: string;
  Password: string;
  EmployeeCode: string;
  DepartmentId?: number | null;
  HireDate?: string | null;
}

/** Admin-only: the whole controller carries `[Authorize(Roles = "Admin")]`. */
export function fetchTeachers(signal?: AbortSignal): Promise<Teacher[]> {
  return apiGet<Teacher[]>('/api/admin/teachers', signal);
}

export function updateTeacher(
  id: number,
  payload: UpdateTeacherPayload,
  signal?: AbortSignal,
): Promise<{ Message: string }> {
  return apiPut<{ Message: string }>(`/api/admin/teachers/${id}`, payload, signal);
}

/** Deactivates the linked user account. There is no reactivate endpoint yet. */
export function deactivateTeacher(id: number, signal?: AbortSignal): Promise<{ Message: string }> {
  return apiPatch<{ Message: string }>(`/api/admin/teachers/${id}/deactivate`, undefined, signal);
}

/**
 * Replaces the teacher's subject allocation with `subjectIdList`, by setting
 * `Subjects.TeacherId` on each chosen subject.
 */
export function assignTeacherSubjects(
  id: number,
  subjectIdList: number[],
  signal?: AbortSignal,
): Promise<{ Message: string }> {
  return apiPost<{ Message: string }>(
    `/api/admin/teachers/${id}/assign-subjects`,
    { SubjectIdList: subjectIdList },
    signal,
  );
}

/** Creates the login, the Teacher role grant and the staff record together. */
export function createTeacher(
  payload: CreateTeacherPayload,
  signal?: AbortSignal,
): Promise<{ Message: string; TeacherId: number; UserId: number }> {
  return apiPost<{ Message: string; TeacherId: number; UserId: number }>(
    '/api/teachers',
    payload,
    signal,
  );
}
