import { apiDelete, apiGet, apiPost, apiPut } from './client';

export type TargetRole = 'All' | 'Admin' | 'Teacher' | 'Student' | 'Parent';

/** The audiences the compose form offers; must match the API's check. */
export const TARGET_ROLES: TargetRole[] = ['All', 'Admin', 'Teacher', 'Student', 'Parent'];

export interface Announcement {
  Id: number;
  Title: string;
  Content: string;
  TargetRole: TargetRole;
  ClassId: number | null;
  ClassName: string | null;
  AuthorName: string | null;
  /** Timestamptz: an ISO-8601 instant. */
  CreatedAt: string;
}

export interface SaveAnnouncementPayload {
  Title: string;
  Content: string;
  TargetRole: TargetRole;
  ClassId: number | null;
}

/** Scoped server-side: a learner only receives what targets them. */
export function fetchAnnouncements(signal?: AbortSignal): Promise<Announcement[]> {
  return apiGet<Announcement[]>('/api/announcements', signal);
}

export function createAnnouncement(
  payload: SaveAnnouncementPayload,
): Promise<{ Message: string; AnnouncementId: number }> {
  return apiPost('/api/announcements', payload);
}

/** A teacher may only edit their own; an Admin may edit any. */
export function updateAnnouncement(
  id: number,
  payload: SaveAnnouncementPayload,
): Promise<{ Message: string }> {
  return apiPut(`/api/announcements/${id}`, payload);
}

export function deleteAnnouncement(id: number): Promise<{ Message: string }> {
  return apiDelete(`/api/announcements/${id}`);
}
