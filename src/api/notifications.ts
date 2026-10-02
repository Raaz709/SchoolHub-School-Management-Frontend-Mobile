import { apiDelete, apiGet, apiPatch } from './client';

/**
 * In-app pub/sub mirroring the web's `NOTIFICATIONS_CHANGED_EVENT` window
 * event: emitted after any change so the top-bar badge can refresh itself.
 */
export const NOTIFICATIONS_CHANGED_EVENT = 'schoolhub:notifications-changed';

type Listener = () => void;
const listeners = new Set<Listener>();

export function onNotificationsChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function announceChange(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      /* ignore */
    }
  });
}

export interface Notification {
  Id: number;
  Title: string;
  Message: string;
  /** Timestamptz: an ISO-8601 instant. */
  CreatedAt: string;
  IsRead: boolean;
}

export function fetchNotifications(signal?: AbortSignal): Promise<Notification[]> {
  return apiGet<Notification[]>('/api/schoolextensions/notifications', signal);
}

export function fetchUnreadCount(signal?: AbortSignal): Promise<{ UnreadCount: number }> {
  return apiGet<{ UnreadCount: number }>('/api/schoolextensions/notifications/unread-count', signal);
}

export function markNotificationRead(id: number): Promise<{ Message: string }> {
  return apiPatch<{ Message: string }>(`/api/schoolextensions/notifications/${id}/read`).then(
    (result) => {
      announceChange();
      return result;
    },
  );
}

export function markAllNotificationsRead(): Promise<{ Message: string; Updated: number }> {
  return apiPatch<{ Message: string; Updated: number }>(
    '/api/schoolextensions/notifications/read-all',
  ).then((result) => {
    announceChange();
    return result;
  });
}

export function deleteNotification(id: number): Promise<{ Message: string }> {
  return apiDelete<{ Message: string }>(`/api/schoolextensions/notifications/${id}`).then(
    (result) => {
      announceChange();
      return result;
    },
  );
}
