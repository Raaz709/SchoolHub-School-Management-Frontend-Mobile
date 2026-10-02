import { apiGet, apiPatch, apiPost, apiPut, buildQuery } from './client';

export interface Student {
  Id: number;
  RollNumber: string;
  AdmissionDate: string | null;
  UserId: number;
  Username: string;
  Email: string;
  IsActive: boolean;
  ClassName: string | null;
  SectionName: string | null;
  /** Ids as well as names: class names are not unique. */
  ClassId: number | null;
  SectionId: number | null;
}

export interface StudentSearchParams {
  query?: string;
  classId?: number | null;
  sectionId?: number | null;
}

export interface CreateStudentPayload {
  Username: string;
  Email: string;
  Password: string;
  RollNumber: string;
  AdmissionDate?: string | null;
  ClassId?: number | null;
  SectionId?: number | null;
}

export interface UpdateStudentPayload {
  RollNumber: string;
}

export interface AssignClassPayload {
  ClassId: number;
  SectionId: number;
}

/** Both the full roster and the filtered search return the same row shape. */
export function fetchStudents(signal?: AbortSignal): Promise<Student[]> {
  return apiGet<Student[]>('/api/students', signal);
}

export function searchStudents(
  params: StudentSearchParams,
  signal?: AbortSignal,
): Promise<Student[]> {
  const qs = buildQuery({
    query: params.query,
    classId: params.classId,
    sectionId: params.sectionId,
  });
  return apiGet<Student[]>(`/api/students/search${qs}`, signal);
}

/**
 * Creates the login, the Student role grant and the student record in one
 * transaction. Admin only.
 */
export function createStudent(
  payload: CreateStudentPayload,
  signal?: AbortSignal,
): Promise<{ Message: string; StudentId: number; UserId: number }> {
  return apiPost('/api/students', payload, signal);
}

/** Roll number is the only editable field. Returns 404 for an unknown id. */
export function updateStudent(
  id: number,
  payload: UpdateStudentPayload,
  signal?: AbortSignal,
): Promise<{ Message: string }> {
  return apiPut(`/api/students/${id}`, payload, signal);
}

/** Blocks sign-in. The student row itself is kept for reporting. */
export function deactivateStudent(id: number, signal?: AbortSignal): Promise<{ Message: string }> {
  return apiPatch<{ Message: string }>(`/api/students/${id}/deactivate`, undefined, signal);
}

/** The inverse of {@link deactivateStudent}, so deactivation is reversible. */
export function reactivateStudent(id: number, signal?: AbortSignal): Promise<{ Message: string }> {
  return apiPatch<{ Message: string }>(`/api/students/${id}/reactivate`, undefined, signal);
}

/**
 * Sets the student's class and section, replacing any previous enrolment.
 * Both are required: `Classes` and `Sections` are separate tables.
 */
export function assignStudentClass(
  id: number,
  payload: AssignClassPayload,
  signal?: AbortSignal,
): Promise<{ Message: string }> {
  return apiPost(`/api/students/${id}/assign-class`, payload, signal);
}
