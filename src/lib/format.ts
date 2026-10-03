/** Shared display formatters so every screen renders dates and money identically. */

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return '';
  // Timetable slots arrive as `HH:mm:ss`; trim to `HH:mm` for display.
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/** Relative label used by the activity feed: "just now", "5m ago", "3d ago". */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}

export function formatCurrency(value: number | string | null | undefined): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return `Rs ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Strips a trailing `.00` so dense tables stay readable. */
export function formatAmount(value: number | string | null | undefined): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Two-letter initials for avatars, matching the web `initials()` helper. */
export function initials(name?: string | null): string {
  return (name ?? '').slice(0, 2).toUpperCase() || '??';
}

/** `Date` → `YYYY-MM-DD` for API payloads that expect a date-only string. */
export function toDateInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayInput(): string {
  return toDateInput(new Date());
}

/**
 * `datetime-local` style value (`YYYY-MM-DDTHH:mm`) → a UTC instant, for fields
 * the API stores as `timestamptz`.
 *
 * Always pair with {@link toLocalInput}: the API hands back a UTC instant, so
 * slicing it would pre-fill the UTC clock while saving re-reads the value as
 * local time, shifting the stored instant on every edit.
 */
export function toIsoInstant(localValue: string): string {
  return new Date(localValue).toISOString();
}

/** A stored instant → the `YYYY-MM-DDTHH:mm` local value a form should show. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** Percentage helper that never divides by zero. */
export function percentage(part: number, total: number): number {
  if (!total) return 0;
  return (part / total) * 100;
}
