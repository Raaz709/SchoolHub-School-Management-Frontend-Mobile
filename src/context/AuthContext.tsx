import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  USER_KEY,
  decodeJwtPayload,
  decodeTokenExpiry,
  getRefreshToken,
  getToken,
  isTokenExpiring,
  onSessionExpired,
  refreshAccessToken,
  setRefreshToken,
  setToken,
} from '../api/client';
import { getItem, setItem } from '../api/storage';
import { login as loginApi, logout as logoutApi, register as registerApi } from '../api/auth';
import type { AuthResponse, AuthUser, RegisterRequest } from '../types/api';

/** Renew this long before the access token actually expires. */
const RENEW_MARGIN_MS = 2 * 60 * 1000;

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True until the stored session has been restored. */
  isLoading: boolean;
  signIn: (res: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(res: AuthResponse): AuthUser {
  return {
    userId: Number(res.UserId ?? 0),
    username: String(res.Username ?? ''),
    role: String(res.Role ?? 'Student'),
  };
}

/**
 * Rebuilds the identity from whatever survived: the cached user row first, then
 * the access token's own claims as a fallback.
 */
async function readStoredUser(): Promise<AuthUser | null> {
  const raw = await getItem(USER_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as AuthUser;
      if (parsed?.username) return parsed;
    } catch {
      /* fall through to the token claims */
    }
  }

  const claims = decodeJwtPayload<{ UserId?: number; Username?: string; Role?: string }>(
    await getToken(),
  );
  if (!claims?.Username) return null;

  return {
    userId: Number(claims.UserId ?? 0),
    username: String(claims.Username),
    role: String(claims.Role ?? 'Student'),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const renewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSession = useCallback(async () => {
    if (renewTimer.current) {
      clearTimeout(renewTimer.current);
      renewTimer.current = null;
    }
    await Promise.all([setToken(null), setRefreshToken(null), setItem(USER_KEY, null)]);
    setUser(null);
  }, []);

  const signIn = useCallback(async (res: AuthResponse) => {
    const next = toAuthUser(res);
    await Promise.all([
      setToken(res.AccessToken),
      setRefreshToken(res.RefreshToken || null),
      setItem(USER_KEY, JSON.stringify(next)),
    ]);
    setUser(next);
  }, []);

  const signOut = useCallback(async () => {
    const refreshToken = await getRefreshToken();
    // Revoke server-side first, but never block the UI on the network.
    void logoutApi(refreshToken);
    await clearSession();
  }, [clearSession]);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await loginApi({ Username: username, Password: password });
      await signIn(res);
    },
    [signIn],
  );

  const register = useCallback(
    async (payload: RegisterRequest) => {
      const res = await registerApi(payload);
      await signIn(res);
    },
    [signIn],
  );

  /* ------------------------------------------------------------ restoration */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [token, refreshToken] = await Promise.all([getToken(), getRefreshToken()]);
        if (!token && !refreshToken) return;

        // Recover from a token that expired while the app was closed.
        let usable = token;
        if (isTokenExpiring(token, RENEW_MARGIN_MS) && refreshToken) {
          usable = await refreshAccessToken();
        }

        if (!usable || cancelled) return;
        const restored = await readStoredUser();
        if (restored && !cancelled) setUser(restored);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* -------------------------------------------------- keep-alive + expiry */
  useEffect(() => {
    if (!user) return;

    const schedule = async () => {
      if (renewTimer.current) {
        clearTimeout(renewTimer.current);
        renewTimer.current = null;
      }

      const exp = decodeTokenExpiry(await getToken());
      if (exp === null) return;

      const delay = Math.max(exp - Date.now() - RENEW_MARGIN_MS, 0);

      renewTimer.current = setTimeout(async () => {
        const renewed = await refreshAccessToken();
        if (renewed) void schedule();
        else void clearSession();
      }, delay);
    };

    void schedule();

    const unsubscribe = onSessionExpired(() => {
      void clearSession();
    });

    return () => {
      unsubscribe();
      if (renewTimer.current) {
        clearTimeout(renewTimer.current);
        renewTimer.current = null;
      }
    };
  }, [user, clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      signIn,
      signOut,
      login,
      register,
    }),
    [user, isLoading, signIn, signOut, login, register],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
