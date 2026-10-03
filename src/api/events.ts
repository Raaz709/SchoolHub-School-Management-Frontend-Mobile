import { apiDelete, apiGet, apiPost, apiPut } from './client';

/**
 * The four responses the API constrains a participant to. "Invited" is the state
 * staff record before anyone has answered.
 */
export type EventStatus = 'Invited' | 'Attending' | 'Not Attending' | 'Maybe';

export type EventItem = {
  Id: number;
  Title: string;
  Description: string | null;
  /** Timestamptz: an ISO-8601 instant, rendered in the viewer's zone. */
  EventDate: string;
  Location: string | null;
  ParticipantCount: number;
  /** The caller's own response, or null when they have not answered. */
  MyStatus: EventStatus | null;
};

export type EventParticipant = {
  UserId: number;
  Username: string;
  Status: EventStatus;
};

export type SaveEventPayload = {
  Title: string;
  Description?: string | null;
  EventDate: string;
  Location?: string | null;
};

export const EVENT_STATUSES: EventStatus[] = ['Invited', 'Attending', 'Not Attending', 'Maybe'];

/** Badge tone per response, matching the web `statusTone` switch. */
export function eventStatusTone(status: EventStatus): 'mint' | 'rose' | 'amber' | 'neutral' {
  switch (status) {
    case 'Attending':
      return 'mint';
    case 'Not Attending':
      return 'rose';
    case 'Maybe':
      return 'amber';
    default:
      return 'neutral';
  }
}

/**
 * The picker value → a UTC instant for the API's timestamptz column.
 *
 * A date-only string is read as local midnight, which keeps an event created for
 * "12 Mar" on that date rather than drifting a day either way.
 */
export function toIsoInstant(localValue: string): string {
  const parsed = new Date(localValue);
  return Number.isNaN(parsed.getTime()) ? localValue : parsed.toISOString();
}

/** A stored instant → the value the date/time picker opens on. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatEventDate(iso: string): string {
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

/* ------------------------------- reads ------------------------------- */

export function fetchEvents(signal?: AbortSignal): Promise<EventItem[]> {
  return apiGet<EventItem[]>('/api/schoolextensions/events', signal);
}

export function fetchEvent(id: number, signal?: AbortSignal): Promise<EventItem> {
  return apiGet<EventItem>(`/api/schoolextensions/events/${id}`, signal);
}

export function fetchEventParticipants(
  id: number,
  signal?: AbortSignal,
): Promise<EventParticipant[]> {
  return apiGet<EventParticipant[]>(`/api/schoolextensions/events/${id}/participants`, signal);
}

/* ------------------------------- writes ------------------------------- */

/** Admin only. Refused with 409 when the title already exists on that date. */
export function createEvent(payload: SaveEventPayload): Promise<{ Message: string; Id: number }> {
  return apiPost<{ Message: string; Id: number }>('/api/schoolextensions/events', payload);
}

/** Admin only. */
export function updateEvent(id: number, payload: SaveEventPayload): Promise<{ Message: string }> {
  return apiPut<{ Message: string }>(`/api/schoolextensions/events/${id}`, payload);
}

export function deleteEvent(id: number): Promise<{ Message: string }> {
  return apiDelete<{ Message: string }>(`/api/schoolextensions/events/${id}`);
}

/** Record the caller's own response. A repeat call replaces the previous one. */
export function setRsvp(id: number, status: EventStatus): Promise<{ Message: string; Status: EventStatus }> {
  return apiPut<{ Message: string; Status: EventStatus }>(`/api/schoolextensions/events/${id}/rsvp`, {
    Status: status,
  });
}

/** Staff may remove anyone's response; a learner only their own (`userId`). */
export function removeParticipant(
  id: number,
  userId: number,
): Promise<{ Message: string }> {
  return apiDelete<{ Message: string }>(`/api/schoolextensions/events/${id}/participants/${userId}`);
}