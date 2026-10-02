/**
 * Shared API shapes.
 *
 * The backend disables ASP.NET Core's camelCase policy (`Program.cs`), so every
 * response member is emitted exactly as declared in C# — PascalCase — and these
 * interfaces line up 1:1 with both the C# DTOs and the web client's types.
 */

export type Role = 'Admin' | 'Teacher' | 'Student' | 'Parent';

export interface AuthResponse {
  AccessToken: string;
  RefreshToken: string;
  Username: string;
  Role: string;
  UserId: number;
}

export interface LoginRequest {
  Username: string;
  Password: string;
}

export interface RegisterRequest {
  Username: string;
  Email: string;
  Password: string;
  /** Only Student and Parent may self-register; staff are created by an admin. */
  Role: 'Student' | 'Parent';
  RollNumber?: string;
  Occupation?: string;
}

export interface AuthUser {
  userId: number;
  username: string;
  role: string;
}

/** Reads a value the API may send as either PascalCase or camelCase. */
export function pick(row: Record<string, unknown>, name: string): unknown {
  return row[name] ?? row[name.charAt(0).toLowerCase() + name.slice(1)];
}

/** Coerces an unknown API value to a number, with a fallback. */
export function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function toStringValue(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

export function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}
