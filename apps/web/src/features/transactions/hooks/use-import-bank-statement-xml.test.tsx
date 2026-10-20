import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { AxiosError } from 'axios';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { importBankStatementXml } from '@/features/transactions/api/transactions-api';
import { queryKeys } from '@/lib/query-keys';

import { useImportBankStatementXml } from './use-import-bank-statement-xml';

vi.mock('@/features/transactions/api/transactions-api', () => ({
  importBankStatementXml: vi.fn(),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useImportBankStatementXml', () => {
  it.each(['ECONNABORTED', 'ETIMEDOUT', 'ERR_NETWORK'])(
    'reports an unconfirmed import and refreshes possibly committed rows after %s',
    async (code) => {
      const error = new AxiosError('No response', code);
      vi.mocked(importBankStatementXml).mockRejectedValue(error);
      const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
      const invalidate = vi.spyOn(client, 'invalidateQueries');
      const { result, unmount } = renderHook(() => useImportBankStatementXml(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        ),
      });

      try {
        await act(async () => {
          await expect(
            result.current.mutateAsync({ xml: '<statement/>', rememberMatchedAccounts: false }),
          ).rejects.toBe(error);
        });

        expect(toast.error).toHaveBeenCalledWith(
          'Status uvoza nije potvrđen.',
          expect.objectContaining({
            description: expect.stringContaining('Deo stavki je možda već uvezen'),
          }),
        );
        expect(toast.success).not.toHaveBeenCalled();
        expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.transactions.all });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.companyExpenses.all });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.trips.all });
        expect(importBankStatementXml).toHaveBeenCalledTimes(1);
      } finally {
        unmount();
        client.clear();
      }
    },
  );
});
