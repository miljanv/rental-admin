'use client';

import type { AuthUserDto } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchCurrentUser, login as loginRequest } from '@/features/auth/api/auth-api';
import { queryKeys } from '@/lib/query-keys';
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
  subscribeUnauthorized,
} from '@/lib/auth-token';

interface AuthContextValue {
  user: AuthUserDto | null;
  isReady: boolean;
  login: (input: { username: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [isReady, setIsReady] = useState(false);

  const logout = useCallback(() => {
    clearAccessToken();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      void Promise.resolve().then(() => {
        setIsReady(true);
      });
      return;
    }

    const controller = new AbortController();

    void fetchCurrentUser(controller.signal)
      .then((currentUser) => {
        setUser(currentUser);
      })
      .catch(() => {
        clearAccessToken();
        setUser(null);
      })
      .finally(() => {
        setIsReady(true);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => subscribeUnauthorized(logout), [logout]);

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (result) => {
      setAccessToken(result.token);
      setUser(result.user);
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.files.all });
    },
  });

  const login = useCallback(
    async (input: { username: string; password: string }) => {
      await loginMutation.mutateAsync(input);
    },
    [loginMutation],
  );

  const value = useMemo(
    () => ({
      user,
      isReady,
      login,
      logout,
    }),
    [user, isReady, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
};
