import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { api, ApiError, setAuthToken } from "@/services/api";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const apply = useCallback(async (auth: AuthResponse | null) => {
    if (auth) {
      setAuthToken(auth.access_token);
      setToken(auth.access_token);
      setUser(auth.user);
      setStatus("authenticated");
      await AsyncStorage.multiSet([
        [TOKEN_KEY, auth.access_token],
        [USER_KEY, JSON.stringify(auth.user)],
      ]);
    } else {
      setAuthToken(null);
      setToken(null);
      setUser(null);
      setStatus("anonymous");
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    }
  }, []);

  // Boot — read token from storage, validate it against /auth/me, fall
  // back to anonymous if it no longer works.
  useEffect(() => {
    (async () => {
      const [[, storedToken], [, storedUser]] = await AsyncStorage.multiGet([
        TOKEN_KEY,
        USER_KEY,
      ]);
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
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(fresh));
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
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(fresh));
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
