import { apiGet, apiPost, apiPut } from './client';

export interface UserProfile {
  Id: number;
  Username: string;
  Email: string;
  ProfilePictureUrl: string | null;
  IsActive: boolean;
  CreatedAt: string;
}

export function fetchProfile(signal?: AbortSignal): Promise<UserProfile> {
  return apiGet<UserProfile>('/api/profile', signal);
}

export function updateProfile(payload: {
  Username: string;
  Email: string;
}): Promise<{ Message: string }> {
  return apiPut<{ Message: string }>('/api/profile', payload);
}

/** `PasswordController.ChangePassword` — POST /api/auth/password/change */
export function changePassword(payload: {
  CurrentPassword: string;
  NewPassword: string;
}): Promise<{ Message: string }> {
  return apiPost<{ Message: string }>('/api/auth/password/change', payload);
}
