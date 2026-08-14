'use client';

import type { AuthUserDto } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchCurrentUser, login as loginRequest } from '@/features/auth/api/auth-api';
import { parseApiError } from '@/lib/api-error';
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
        if (controller.signal.aborted) {
          return;
        }

        setUser(currentUser);
      })
      .catch((error: unknown) => {
        // Strict Mode remounts abort the first request. That is not a failed
        // session — clearing the token here logs the user out on the next call.
        if (controller.signal.aborted || parseApiError(error).isCanceled) {
          return;
        }

        clearAccessToken();
        setUser(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsReady(true);
        }
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
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
