'use client';

import { QueryClient, QueryClientProvider, isServer } from '@tanstack/react-query';
import { useState } from 'react';

import { parseApiError } from '@/lib/api-error';

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Long enough to avoid refetch storms while navigating, short enough
        // that the table stays current after a mutation elsewhere.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          const parsed = parseApiError(error);

          if (parsed.isCanceled) {
            return false;
          }

          // Never retry a request the server rejected on its merits.
          const isRetryable =
            parsed.isNetworkError ||
            (parsed.status !== undefined && RETRYABLE_STATUS.has(parsed.status));

          return isRetryable && failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
      },
      mutations: {
        retry: false,
      },
    },
  });

let browserQueryClient: QueryClient | undefined;

const getQueryClient = (): QueryClient => {
  // A fresh client per server render, one shared client in the browser.
  if (isServer) {
    return createQueryClient();
  }

  browserQueryClient ??= createQueryClient();

  return browserQueryClient;
};

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(getQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
