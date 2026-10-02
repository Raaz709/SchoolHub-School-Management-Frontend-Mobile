import { apiPost, getApiBaseUrl } from './client';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types/api';

export function login(payload: LoginRequest): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/api/auth/login', payload);
}

export function register(payload: RegisterRequest): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/api/auth/register', payload);
}

export function refresh(refreshToken: string): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/api/auth/refresh', { RefreshToken: refreshToken });
}

/**
 * Revokes the refresh token server-side so the session cannot be renewed.
 *
 * Deliberately uses a raw fetch rather than `apiPost`: that helper renews the
 * access token on a 401, which would silently re-create the very session the
 * user is trying to end. Best-effort — the caller clears local tokens either way.
 */
export async function logout(refreshToken: string | null): Promise<void> {
  if (!refreshToken) return;
  try {
    await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ RefreshToken: refreshToken }),
    });
  } catch {
    /* ignore — the local session is cleared regardless */
  }
}
