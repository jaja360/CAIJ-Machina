"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  apiLogin,
  apiRegister,
  apiRefresh,
  apiRevoke,
  apiGetMe,
  type ApiUser,
} from "@/lib/api";

interface AuthContextValue {
  user: ApiUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isRestoring: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    jobTitle: string,
    firstName: string,
    lastName: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Storage keys ────────────────────────────────────────────────────────────
const TOKEN_KEY    = "lv_token";
const USER_KEY     = "lv_user";
const REFRESH_KEY  = "lv_refresh_token";

// ── Safe localStorage helpers (guard SSR) ───────────────────────────────────
function getLocal(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setLocal(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch { /* quota exceeded — degrade silently */ }
}

function removeLocal(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch { /* ignore */ }
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser]   = useState<ApiUser | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // ── Session restore on mount via refresh token ──────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      const refreshToken = getLocal(REFRESH_KEY);

      if (!refreshToken) {
        removeLocal(TOKEN_KEY);
        removeLocal(USER_KEY);
        if (!cancelled) {
          setToken(null);
          setUser(null);
          setIsRestoring(false);
        }
        return;
      }

      try {
        const { token: newToken } = await apiRefresh(refreshToken);
        if (cancelled) return;

        // Fetch user profile with the new token
        const me = await apiGetMe(newToken);
        if (cancelled) return;

        setToken(newToken);
        setUser(me.user);
        setLocal(TOKEN_KEY, newToken);
        setLocal(USER_KEY, JSON.stringify(me.user));
      } catch {
        // Refresh failed — wipe everything
        if (!cancelled) {
          removeLocal(TOKEN_KEY);
          removeLocal(USER_KEY);
          removeLocal(REFRESH_KEY);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsRestoring(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Persist helpers ─────────────────────────────────────────────────────
  const persist = useCallback(
    (u: ApiUser, t: string, rt: string) => {
      setUser(u);
      setToken(t);
      setLocal(TOKEN_KEY, t);
      setLocal(USER_KEY, JSON.stringify(u));
      setLocal(REFRESH_KEY, rt);
    },
    [],
  );

  const clearPersisted = useCallback(() => {
    setToken(null);
    setUser(null);
    removeLocal(TOKEN_KEY);
    removeLocal(USER_KEY);
    removeLocal(REFRESH_KEY);
  }, []);

  // ── Login ───────────────────────────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiLogin(email, password);
      // Flat response: User fields + token + refresh_token at top level
      const { token: t, refresh_token: rt, ...userFields } = data;
      persist(userFields as ApiUser, t, rt);
    },
    [persist],
  );

  // ── Register ────────────────────────────────────────────────────────────
  const register = useCallback(
    async (
      email: string,
      password: string,
      jobTitle: string,
      firstName: string,
      lastName: string,
    ) => {
      await apiRegister(email, password, jobTitle, firstName, lastName);
      await login(email, password);
    },
    [login],
  );

  // ── Logout (revoke + clear) ─────────────────────────────────────────────
  const logout = useCallback(async () => {
    const refreshToken = getLocal(REFRESH_KEY);
    if (refreshToken) {
      // Best-effort: don't block the UI on revoke failure
      try {
        await apiRevoke(refreshToken);
      } catch {
        // Swallow — remote may be unreachable
      }
    }
    clearPersisted();
  }, [clearPersisted]);

  // ── Context value ───────────────────────────────────────────────────────
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: !!token,
      isRestoring,
      login,
      register,
      logout,
    }),
    [user, token, isRestoring, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Derive display-friendly name, initials, and role from an ApiUser. */
export function userDisplay(user: ApiUser, fallbackRole: string) {
  const hasRealName = user.first_name || user.last_name;
  const name = hasRealName
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.email
        .split("@")[0]
        .split(/[._-]/)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
  const initials = hasRealName
    ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
    : name
        .split(" ")
        .map((p) => p.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();
  const role =
    user.job_title && user.job_title !== "Unknown"
      ? user.job_title
      : fallbackRole;
  return { name, initials, role };
}
