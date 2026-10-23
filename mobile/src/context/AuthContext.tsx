import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setAuthToken, setUnauthorizedHandler } from '../api/client';
import type { User } from '../types';

const STORAGE_KEY = 'miniledger.session';

type AuthState = {
  user: User | null;
  loading: boolean; // true while we check for a saved login
  login: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => void logout());
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const { token, user: savedUser } = JSON.parse(saved);
          setAuthToken(token);
          setUser(savedUser);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [logout]);

  const login = useCallback(async (phone: string, otp: string) => {
    const { token, user: u } = await api.verifyOtp(phone, otp);
    setAuthToken(token);
    setUser(u);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user: u }));
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
