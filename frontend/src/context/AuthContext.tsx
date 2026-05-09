"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiLogin, apiRegister, type ApiUser } from "@/lib/api";

interface AuthContextValue {
  user: ApiUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, jobTitle: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "lv_token";
const USER_KEY  = "lv_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser]   = useState<ApiUser | null>(null);

  // Rehydrate from localStorage on mount (client only)
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser  = localStorage.getItem(USER_KEY);
    if (storedToken) setToken(storedToken);
    if (storedUser)  {
      try { setUser(JSON.parse(storedUser)); } catch { /* ignore corrupt data */ }
    }
  }, []);

  const persist = useCallback((u: ApiUser, t: string) => {
    setUser(u);
    setToken(t);
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    const { token: t, refresh_token: _r, ...u } = data;
    persist(u as ApiUser, t);
  }, [persist]);

  const register = useCallback(async (
    email: string,
    password: string,
    jobTitle: string,
    firstName: string,
    lastName: string,
  ) => {
    await apiRegister(email, password, jobTitle, firstName, lastName);
    await login(email, password);
  }, [login]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, isAuthenticated: !!token, login, register, logout }),
    [user, token, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

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
    : user.email.split("@")[0].split(/[._-]/).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  const initials = hasRealName
    ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
    : name.split(" ").map((p) => p.charAt(0)).join("").slice(0, 2).toUpperCase();
  const role = user.job_title && user.job_title !== "Unknown" ? user.job_title : fallbackRole;
  return { name, initials, role };
}
