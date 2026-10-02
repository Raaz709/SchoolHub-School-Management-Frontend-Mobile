import { apiDelete, apiGet, apiPost, apiPut } from './client';

export interface Assignment {
  Id: number;
  SubjectId: number;
  SubjectName: string;
  Title: string;
  Description: string | null;
  DueDate: string;
  MaxScore: number | null;
  AttachmentUrl: string | null;
  TeacherName: string | null;
  SubmissionCount: number;
  MySubmissionId: number | null;
  MySubmittedAt: string | null;
  MyScore: number | null;
  MyFeedback: string | null;
  MyFilePath: string | null;
}

export interface Submission {
  Id: number;
  StudentId: number;
  StudentName: string;
  RollNumber: string | null;
  FilePath: string | null;
  SubmittedAt: string;
  Score: number | null;
  Feedback: string | null;
}

export interface SaveAssignmentPayload {
  SubjectId: number;
  Title: string;
  Description?: string | null;
  DueDate: string;
  MaxScore: number;
  AttachmentUrl?: string | null;
}

export function formatDue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isOverdue(iso: string): boolean {
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}

export function fetchAssignments(signal?: AbortSignal): Promise<Assignment[]> {
  return apiGet<Assignment[]>('/api/assignments', signal);
}

export function fetchAssignment(id: number, signal?: AbortSignal): Promise<Assignment> {
  return apiGet<Assignment>(`/api/assignments/${id}`, signal);
}

export function fetchSubmissions(id: number, signal?: AbortSignal): Promise<Submission[]> {
  return apiGet<Submission[]>(`/api/assignments/${id}/submissions`, signal);
}

export function createAssignment(
  payload: SaveAssignmentPayload,
): Promise<{ Message: string; AssignmentId: number }> {
  return apiPost('/api/assignments', payload);
}

export function updateAssignment(
  id: number,
  payload: SaveAssignmentPayload,
): Promise<{ Message: string }> {
  return apiPut(`/api/assignments/${id}`, payload);
}

export function deleteAssignment(id: number): Promise<{ Message: string }> {
  return apiDelete(`/api/assignments/${id}`);
}

export function gradeSubmission(
  submissionId: number,
  score: number | null,
  feedback: string | null,
): Promise<{ Message: string }> {
  return apiPut(`/api/assignments/submissions/${submissionId}`, { Score: score, Feedback: feedback });
}

export function submitAssignment(
  assignmentId: number,
  filePath: string,
): Promise<{ Message: string; SubmissionId: number }> {
  return apiPost('/api/assignments/submit', { AssignmentId: assignmentId, FilePath: filePath });
}
