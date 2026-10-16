'use client';

import type { AuthUserDto } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchCurrentUser, login as loginRequest } from '@/features/auth/api/auth-api';
import {
  clearActiveOrganizationId,
  getActiveOrganizationId,
  setActiveOrganizationId,
} from '@/lib/active-organization';
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
  /** The organization a superadmin works in. Always null for regular users. */
  activeOrganizationId: string | null;
  /** Switches a superadmin to another organization (or none) and reloads what is on screen. */
  selectOrganization: (organizationId: string | null) => void;
  login: (input: { username: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [activeOrganizationId, setActiveOrganization] = useState<string | null>(null);

  const logout = useCallback(() => {
    clearAccessToken();
    clearActiveOrganizationId();
    setUser(null);
    setActiveOrganization(null);
    queryClient.clear();
  }, [queryClient]);

  const selectOrganization = useCallback(
    (organizationId: string | null) => {
      if (organizationId) {
        setActiveOrganizationId(organizationId);
      } else {
        clearActiveOrganizationId();
      }

      setActiveOrganization(organizationId);
      // Nothing cached for the previous organization may stay on screen.
      void queryClient.resetQueries();
    },
    [queryClient],
  );

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

        if (currentUser.role === 'SUPERADMIN') {
          setActiveOrganization(getActiveOrganizationId());
        } else {
          clearActiveOrganizationId();
        }
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
      // A fresh sign-in always starts without a chosen organization.
      clearActiveOrganizationId();
      setActiveOrganization(null);
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
      activeOrganizationId,
      selectOrganization,
      login,
      logout,
    }),
    [user, isReady, activeOrganizationId, selectOrganization, login, logout],
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
