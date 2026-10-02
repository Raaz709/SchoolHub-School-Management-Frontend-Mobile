import { apiDelete, apiGet, apiPost, apiPut } from './client';

export interface Exam {
  Id: number;
  Title: string;
  AcademicYearId: number | null;
  StartDate: string | null;
  EndDate: string | null;
  PassingMarks: number | null;
  AcademicYearName: string | null;
  ClassCount: number;
  SubjectCount: number;
  MarkCount: number;
}

export interface ExamSubject {
  Id: number;
  ExamId: number;
  ClassId: number;
  SubjectId: number | null;
  MaxMarks: number;
  ExamDate: string | null;
  ClassName: string;
  SubjectName: string | null;
  SubjectCode: string | null;
  MarkCount: number;
}

export interface ExamDetail {
  Exam: Exam;
  Subjects: ExamSubject[];
}

export interface RosterStudent {
  StudentId: number;
  RollNumber: string;
  Username: string;
  MarkId: number | null;
  MarksObtained: number | null;
  Grade: string | null;
  Remarks: string | null;
}

export interface MarksRoster {
  ExamSubjectId: number;
  ExamId: number;
  ExamTitle: string;
  ClassId: number;
  ClassName: string;
  SubjectId: number | null;
  SubjectName: string | null;
  MaxMarks: number;
  PassingPercentage: number;
  ExamDate: string | null;
  Students: RosterStudent[];
}

export interface TranscriptRow {
  ExamId: number;
  ExamTitle: string | null;
  PassingPercentage: number;
  SubjectCount: number;
  PassedCount: number;
  TotalObtained: number;
  TotalMax: number;
  OverallPercentage: number;
  Passed: boolean;
}

export interface MarkResult {
  StudentId: number;
  MarksObtained: number;
  MaxMarks: number;
  Percentage: number;
  Grade: string;
  Passed: boolean;
}

export interface SaveMarksResult {
  Message: string;
  ExamSubjectId: number;
  Saved: number;
  Marks: MarkResult[];
}

export interface SaveExamPayload {
  Title: string;
  AcademicYearId: number;
  StartDate?: string | null;
  EndDate?: string | null;
  PassingMarks?: number | null;
}

export interface SaveExamSubjectPayload {
  ClassId: number;
  SubjectId: number;
  MaxMarks: number;
  ExamDate?: string | null;
}

export interface MarkItem {
  StudentId: number;
  MarksObtained: number;
  Remarks: string;
}

export interface AcademicYear {
  Id: number;
  Name: string;
  StartDate: string | null;
  EndDate: string | null;
  IsCurrent: boolean;
}

export function fetchAcademicYears(signal?: AbortSignal): Promise<AcademicYear[]> {
  return apiGet<AcademicYear[]>('/api/schoolextensions/academic-years', signal);
}

export function fetchExams(signal?: AbortSignal): Promise<Exam[]> {
  return apiGet<Exam[]>('/api/exams', signal);
}

export function fetchExam(id: number, signal?: AbortSignal): Promise<ExamDetail> {
  return apiGet<ExamDetail>(`/api/exams/${id}`, signal);
}

export function fetchMarksRoster(examSubjectId: number, signal?: AbortSignal): Promise<MarksRoster> {
  return apiGet<MarksRoster>(`/api/exams/subjects/${examSubjectId}/roster`, signal);
}

export function fetchMyResults(signal?: AbortSignal): Promise<TranscriptRow[]> {
  return apiGet<TranscriptRow[]>('/api/exams/mine', signal);
}

export function fetchStudentResults(studentId: number, signal?: AbortSignal): Promise<TranscriptRow[]> {
  return apiGet<TranscriptRow[]>(`/api/exams/student/${studentId}`, signal);
}

export function createExam(payload: SaveExamPayload): Promise<{ Message: string; ExamId: number }> {
  return apiPost('/api/exams', payload);
}

export function updateExam(
  id: number,
  payload: SaveExamPayload,
): Promise<{ Message: string; ExamId: number }> {
  return apiPut(`/api/exams/${id}`, payload);
}

export function deleteExam(id: number): Promise<{ Message: string }> {
  return apiDelete(`/api/exams/${id}`);
}

export function addExamSubject(
  examId: number,
  payload: SaveExamSubjectPayload,
): Promise<{ Message: string; ExamSubjectId: number }> {
  return apiPost(`/api/exams/${examId}/subjects`, payload);
}

export function deleteExamSubject(
  examId: number,
  examSubjectId: number,
): Promise<{ Message: string }> {
  return apiDelete(`/api/exams/${examId}/subjects/${examSubjectId}`);
}

export function saveMarks(
  examSubjectId: number,
  marks: MarkItem[],
): Promise<SaveMarksResult> {
  return apiPut(`/api/exams/subjects/${examSubjectId}/marks`, { Marks: marks });
}
