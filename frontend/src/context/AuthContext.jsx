import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/authApi';
import { registerUnauthorizedHandler } from '../api/axiosClient';

const AuthContext = createContext(null);

const TOKEN_KEY = 'medisync_token';
const USER_KEY = 'medisync_user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isInitializing, setIsInitializing] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  const persistSession = useCallback((nextToken, nextUser) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(logout);
    return () => registerUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    let active = true;
    const savedToken = localStorage.getItem(TOKEN_KEY);

    async function verifyToken() {
      if (!savedToken) {
        if (active) setIsInitializing(false);
        return;
      }

      try {
        const profile = await authApi.me();
        if (active) {
          localStorage.setItem(USER_KEY, JSON.stringify(profile));
          setUser(profile);
        }
      } catch {
        if (active) {
          logout();
        }
      } finally {
        if (active) setIsInitializing(false);
      }
    }

    verifyToken();
    return () => {
      active = false;
    };
  }, [logout]);

  const login = useCallback(
    async (email, password) => {
      const data = await authApi.login({ email, password });
      persistSession(data.token, data.user);
      return data.user;
    },
    [persistSession]
  );

  const register = useCallback(
    async (payload) => {
      const data = await authApi.register(payload);
      persistSession(data.token, data.user);
      return data.user;
    },
    [persistSession]
  );

  const refreshProfile = useCallback(async () => {
    const profile = await authApi.me();
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
    setUser(profile);
    return profile;
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      isInitializing,
      login,
      register,
      logout,
      refreshProfile,
    }),
    [token, user, isInitializing, login, register, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}

