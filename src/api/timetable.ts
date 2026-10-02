import { apiDelete, apiGet, apiPost, apiPut, buildQuery } from './client';

/**
 * `DayOfWeek` is 1 = Monday … 7 = Sunday (ISO-8601), not the .NET
 * `System.DayOfWeek` numbering. The API rejects anything outside 1–7.
 */
export const TIMETABLE_DAYS = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 7, label: 'Sunday', short: 'Sun' },
] as const;

export function dayLabel(dayOfWeek: number): string {
  return TIMETABLE_DAYS.find((day) => day.value === dayOfWeek)?.label ?? `Day ${dayOfWeek}`;
}

export interface TimetableEntry {
  Id: number;
  ClassId: number;
  ClassName: string;
  SectionId: number;
  SectionName: string;
  SubjectId: number;
  SubjectName: string;
  /** Null when the period has no teacher yet. */
  TeacherId: number | null;
  TeacherName: string | null;
  TimeSlotId: number;
  /** `HH:mm:ss` — rendered through `formatTime`. */
  StartTime: string;
  EndTime: string;
  SlotLabel: string | null;
  DayOfWeek: number;
}

/** `TeacherId` of 0 is how the API clears an entry's teacher. */
export interface TimetableEntryPayload {
  ClassId: number;
  SectionId: number;
  SubjectId: number;
  TeacherId: number;
  TimeSlotId: number;
  DayOfWeek: number;
}

export interface TimeSlot {
  Id: number;
  StartTime: string;
  EndTime: string;
  Label: string | null;
}

export interface TimeSlotPayload {
  StartTime: string;
  EndTime: string;
  Label: string | null;
}

/** Requires both ids; the API rejects a mismatched class/section pair. */
export function fetchTimetable(
  classId: number,
  sectionId: number,
  signal?: AbortSignal,
): Promise<TimetableEntry[]> {
  return apiGet<TimetableEntry[]>(
    `/api/schoolextensions/timetable${buildQuery({ classId, sectionId })}`,
    signal,
  );
}

/**
 * The caller's own week, resolved server-side: a teacher gets everything they
 * teach, a student their class's timetable.
 */
export function fetchMyTimetable(signal?: AbortSignal): Promise<TimetableEntry[]> {
  return apiGet<TimetableEntry[]>('/api/schoolextensions/timetable/mine', signal);
}

/** Admin and Teacher may read any student; a Parent only a linked child. */
export function fetchStudentTimetable(
  studentId: number,
  signal?: AbortSignal,
): Promise<TimetableEntry[]> {
  return apiGet<TimetableEntry[]>(`/api/schoolextensions/timetable/student/${studentId}`, signal);
}

export function createTimetableEntry(
  payload: TimetableEntryPayload,
  signal?: AbortSignal,
): Promise<{ Message: string; Id: number }> {
  return apiPost('/api/schoolextensions/timetable', payload, signal);
}

export function updateTimetableEntry(
  id: number,
  payload: TimetableEntryPayload,
  signal?: AbortSignal,
): Promise<{ Message: string }> {
  return apiPut(`/api/schoolextensions/timetable/${id}`, payload, signal);
}

export function deleteTimetableEntry(
  id: number,
  signal?: AbortSignal,
): Promise<{ Message: string }> {
  return apiDelete(`/api/schoolextensions/timetable/${id}`, signal);
}

/* ---------------------------------------------------------------- periods */

export function fetchTimeSlots(signal?: AbortSignal): Promise<TimeSlot[]> {
  return apiGet<TimeSlot[]>('/api/schoolextensions/timeslots', signal);
}

export function createTimeSlot(
  payload: TimeSlotPayload,
  signal?: AbortSignal,
): Promise<{ Message: string; Id: number }> {
  return apiPost('/api/schoolextensions/timeslots', payload, signal);
}

/** Refuses with 409 when the new time overlaps an existing period. */
export function updateTimeSlot(
  id: number,
  payload: TimeSlotPayload,
  signal?: AbortSignal,
): Promise<{ Message: string }> {
  return apiPut(`/api/schoolextensions/timeslots/${id}`, payload, signal);
}

/** Refuses with 409 while timetable entries are still scheduled into the period. */
export function deleteTimeSlot(id: number, signal?: AbortSignal): Promise<{ Message: string }> {
  return apiDelete(`/api/schoolextensions/timeslots/${id}`, signal);
}
