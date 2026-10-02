import Constants from 'expo-constants';
import { getItem, setItem } from './storage';

const TOKEN_KEY = 'schoolhub.token';
const REFRESH_TOKEN_KEY = 'schoolhub.refreshToken';
export const USER_KEY = 'schoolhub.user';

/**
 * Base URL resolution order:
 *   1. `EXPO_PUBLIC_API_BASE_URL` from the project `.env` (inlined at build time)
 *   2. `expo.extra.apiBaseUrl` from `app.json` (handy for device testing)
 *   3. localhost, matching the backend's `launchSettings.json` profile
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  const fromExtra =
    (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ??
    (Constants.expoConfig?.extra as { EXPO_PUBLIC_API_BASE_URL?: string } | undefined)
      ?.EXPO_PUBLIC_API_BASE_URL;

  const raw = fromEnv || fromExtra || 'http://localhost:5000';
  return raw.replace(/\/+$/, '');
}

const API_BASE_URL = resolveBaseUrl();

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

/* ------------------------------------------------------------------ session */

type SessionListener = () => void;

const sessionExpiredListeners = new Set<SessionListener>();

/** Registers the "refresh definitively failed, sign the user out" hook. */
export function onSessionExpired(listener: SessionListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

function emitSessionExpired(): void {
  sessionExpiredListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      /* a broken listener must not block the others */
    }
  });
}

/* ------------------------------------------------------------------- tokens */

export const getToken = () => getItem(TOKEN_KEY);
export const setToken = (token: string | null) => setItem(TOKEN_KEY, token);
export const getRefreshToken = () => getItem(REFRESH_TOKEN_KEY);
export const setRefreshToken = (token: string | null) => setItem(REFRESH_TOKEN_KEY, token);

/* -------------------------------------------------------------------- error */

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/* ------------------------------------------------------------ jwt utilities */

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Decodes a base64url segment without relying on a global `atob`, which is not
 * guaranteed on every React Native engine. Bytes are rebuilt by hand and then
 * UTF-8 decoded so non-ASCII claims survive too.
 */
function decodeBase64Url(segment: string): string {
  const cleaned = segment.replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/]/g, '');

  const bytes: number[] = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    const c0 = B64_CHARS.indexOf(cleaned[i]);
    const c1 = B64_CHARS.indexOf(cleaned[i + 1]);
    const c2 = B64_CHARS.indexOf(cleaned[i + 2]);
    const c3 = B64_CHARS.indexOf(cleaned[i + 3]);

    if (c0 < 0 || c1 < 0) break;
    bytes.push((c0 << 2) | (c1 >> 4));
    if (c2 >= 0) bytes.push(((c1 & 15) << 4) | (c2 >> 2));
    if (c3 >= 0) bytes.push(((c2 & 3) << 6) | c3);
  }

  let percent = '';
  for (const byte of bytes) percent += `%${byte.toString(16).padStart(2, '0')}`;

  try {
    return decodeURIComponent(percent);
  } catch {
    return '';
  }
}

export function decodeJwtPayload<T = Record<string, unknown>>(token: string | null): T | null {
  if (!token) return null;
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    return JSON.parse(decodeBase64Url(segment)) as T;
  } catch {
    return null;
  }
}

/** Reads the `exp` claim as a millisecond timestamp, or null if unreadable. */
export function decodeTokenExpiry(token: string | null): number | null {
  const payload = decodeJwtPayload<{ exp?: number }>(token);
  return typeof payload?.exp === 'number' ? payload.exp * 1000 : null;
}

/** True when the token is missing, expired, or about to expire within `ms`. */
export function isTokenExpiring(token: string | null, ms = 0): boolean {
  if (!token) return true;
  const exp = decodeTokenExpiry(token);
  if (exp === null) return true;
  return Date.now() >= exp - ms;
}

/* ------------------------------------------------------------------ refresh */

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Exchanges the stored refresh token for a new access token.
 *
 * De-duplicated behind a single promise because the backend rotates refresh
 * tokens: parallel refreshes would each invalidate the other.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const stored = await getRefreshToken();
      if (!stored) return null;

      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ RefreshToken: stored }),
      });

      if (!res.ok) {
        await setRefreshToken(null);
        await setToken(null);
        return null;
      }

      const data = (await res.json()) as {
        accessToken?: string;
        AccessToken?: string;
        refreshToken?: string;
        RefreshToken?: string;
      };

      const accessToken = data.accessToken ?? data.AccessToken ?? null;
      const refreshToken = data.refreshToken ?? data.RefreshToken ?? null;

      await setToken(accessToken);
      await setRefreshToken(refreshToken);
      return accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/* ------------------------------------------------------------------ request */

async function readError(res: Response, fallback: string): Promise<ApiError> {
  let message = fallback;
  try {
    const text = await res.text();
    if (text) {
      try {
        const parsed = JSON.parse(text) as { message?: string; title?: string; Message?: string };
        message = parsed.message ?? parsed.Message ?? parsed.title ?? text;
      } catch {
        message = text;
      }
    }
  } catch {
    /* keep fallback */
  }
  return new ApiError(res.status, message);
}

async function request<T>(
  path: string,
  init: RequestInit,
  signal?: AbortSignal,
  allowRetry = true,
): Promise<T> {
  const token = await getToken();
  const hasBody = init.body != null;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });

  // A 401 on an authenticated call means the access token aged out. Try one
  // silent renewal, then replay the original request exactly once.
  if (res.status === 401 && allowRetry && token) {
    const renewed = await refreshAccessToken();
    if (renewed) {
      return request<T>(path, init, signal, false);
    }
    emitSessionExpired();
  }

  if (!res.ok) {
    throw await readError(res, `${init.method ?? 'GET'} ${path} failed (${res.status})`);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { method: 'GET' }, signal);
}

export function apiPost<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) }, signal);
}

export function apiPut<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { method: 'PUT', body: JSON.stringify(body) }, signal);
}

export function apiPatch<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(
    path,
    { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) },
    signal,
  );
}

export function apiDelete<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { method: 'DELETE' }, signal);
}

/** Builds a `?a=1&b=2` query string, skipping empty values. */
export function buildQuery(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return search ? `?${search}` : '';
}
