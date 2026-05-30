"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api, ApiError, setAuthToken } from "@/lib/api";
import type { AuthResponse, User } from "@/types/api";

const TOKEN_KEY = "mestreai:auth_token";
const USER_KEY = "mestreai:auth_user";

type AuthStatus = "loading" | "anonymous" | "authenticated";

interface AuthState {
  status: AuthStatus;
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

// localStorage is only available in the browser. These helpers no-op during
// SSR so the provider can render on the server without crashing.
function readStored(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStored(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}
function removeStored(...keys: string[]): void {
  if (typeof window === "undefined") return;
  try {
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const apply = useCallback(async (auth: AuthResponse | null) => {
    if (auth) {
      setAuthToken(auth.access_token);
      setToken(auth.access_token);
      setUser(auth.user);
      setStatus("authenticated");
      writeStored(TOKEN_KEY, auth.access_token);
      writeStored(USER_KEY, JSON.stringify(auth.user));
    } else {
      setAuthToken(null);
      setToken(null);
      setUser(null);
      setStatus("anonymous");
      removeStored(TOKEN_KEY, USER_KEY);
    }
  }, []);

  // Boot — read token from storage, validate it against /auth/me, fall
  // back to anonymous if it no longer works.
  useEffect(() => {
    (async () => {
      const storedToken = readStored(TOKEN_KEY);
      const storedUser = readStored(USER_KEY);
      if (!storedToken) {
        setStatus("anonymous");
        return;
      }
      setAuthToken(storedToken);
      setToken(storedToken);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser) as User);
        } catch {}
      }
      try {
        const fresh = await api.me();
        setUser(fresh);
        setStatus("authenticated");
        writeStored(USER_KEY, JSON.stringify(fresh));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await apply(null);
        } else {
          // Network blip — keep the cached user/token so the app still loads.
          setStatus("authenticated");
        }
      }
    })();
  }, [apply]);

  const login = useCallback(
    async (email: string, password: string) => {
      const auth = await api.login({ email: email.trim().toLowerCase(), password });
      await apply(auth);
    },
    [apply],
  );

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      const auth = await api.signup({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      await apply(auth);
    },
    [apply],
  );

  const continueAsGuest = useCallback(async () => {
    const auth = await api.guestSession();
    await apply(auth);
  }, [apply]);

  const logout = useCallback(async () => {
    await apply(null);
  }, [apply]);

  const refreshUser = useCallback(async () => {
    try {
      const fresh = await api.me();
      setUser(fresh);
      writeStored(USER_KEY, JSON.stringify(fresh));
    } catch {}
  }, []);

  const value = useMemo<AuthState>(
    () => ({ status, user, token, login, signup, continueAsGuest, logout, refreshUser }),
    [status, user, token, login, signup, continueAsGuest, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve estar dentro de <AuthProvider>");
  return ctx;
}
