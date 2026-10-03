import { apiGet } from './client';

/**
 * A row from `GET /api/AuditLogs`.
 *
 * The controller projects the joined `Users.Username`, so a row stays readable
 * even after the acting user was deleted — `Username` is null in that case.
 */
export interface AuditLog {
  Id: number;
  /** Short verb written by the API, e.g. "LOGIN", "CREATE_STUDENT". */
  Action: string;
  /**
   * `Details` is a Postgres `jsonb` column, so it arrives as a string. It is
   * usually a JSON object, but the API has written plain text into it too, so
   * consumers must handle both.
   */
  Details: string | null;
  IpAddress: string | null;
  CreatedAt: string;
  Username: string | null;
}

/** Administrator only: the controller is `[Authorize(Roles = "Admin")]`. */
export function fetchAuditLogs(signal?: AbortSignal): Promise<AuditLog[]> {
  return apiGet<AuditLog[]>('/api/AuditLogs', signal);
}
