import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { CurrentUser } from "@studybox/shared";

import { api, ApiClientError } from "./api";

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  register: (input: {
    username: string;
    password: string;
    realName: string;
    schoolName: string;
    grade: number;
    classNumber: number;
    studentNumber: number;
  }) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await api.getMe();
      setUser(result.user);
    } catch (error) {
      if (!(error instanceof ApiClientError) || error.status !== 401) {
        throw error;
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  const register = useCallback(async (input: {
    username: string;
    password: string;
    realName: string;
    schoolName: string;
    grade: number;
    classNumber: number;
    studentNumber: number;
  }) => {
    await api.register(input);
    await refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    await api.login({ username, password });
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};
