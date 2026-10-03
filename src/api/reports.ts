import { apiGet } from './client';

/**
 * `GET /api/reports/students-by-class`.
 *
 * The endpoint runs an untyped query, so the column names are whatever the SQL
 * aliases them to. `SectionName` is null for a class that has no sections yet.
 */
export interface StudentsByClassRow {
  ClassName: string;
  SectionName: string | null;
  /** Npgsql returns `COUNT(...)` as a 64-bit integer. */
  StudentCount: number;
}

/** `GET /api/reports/fee-collection`, grouped by the API's derived status. */
export interface FeeCollectionRow {
  /** Paid, Overdue, Partial or Unpaid, computed with the same precedence as FeesController. */
  Status: string;
  FeeCount: number;
  TotalAmount: number;
  TotalPaid: number;
  TotalOutstanding: number;
}

/** Admin-only: the controller carries `[Authorize(Roles = "Admin")]`. */
export function fetchStudentsByClassReport(signal?: AbortSignal): Promise<StudentsByClassRow[]> {
  return apiGet<StudentsByClassRow[]>('/api/reports/students-by-class', signal);
}

export function fetchFeeCollectionReport(signal?: AbortSignal): Promise<FeeCollectionRow[]> {
  return apiGet<FeeCollectionRow[]>('/api/reports/fee-collection', signal);
}
