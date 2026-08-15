import type {
  FinanceExportFormat,
  FinanceExportQueryInput,
} from '@rental-admin/shared';
import axios from 'axios';

import { apiClient } from '@/lib/api-client';
import { parseApiError } from '@/lib/api-error';

export type FinanceExportParams = Omit<FinanceExportQueryInput, 'format'>;

const EXPORT_TIMEOUT_MS = 60_000;

const compactParams = (
  params: FinanceExportParams & { format: FinanceExportFormat },
): Record<string, string | boolean | number> => {
  const query: Record<string, string | boolean | number> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') {
      continue;
    }

    if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
      query[key] = value;
    }
  }

  return query;
};

const fileNameFromDisposition = (header: string | undefined, format: FinanceExportFormat): string => {
  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(header ?? '');

  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }

  const asciiMatch = /filename="([^"]+)"/i.exec(header ?? '');

  if (asciiMatch?.[1]) {
    return asciiMatch[1];
  }

  return `finansije.${format}`;
};

export const downloadFinanceExport = async (
  params: FinanceExportParams & { format: FinanceExportFormat },
): Promise<{ blob: Blob; fileName: string }> => {
  try {
    const response = await apiClient.get<Blob>('/transactions/reports/export', {
      params: compactParams(params),
      responseType: 'blob',
      timeout: EXPORT_TIMEOUT_MS,
    });

    return {
      blob: response.data,
      fileName: fileNameFromDisposition(
        response.headers['content-disposition'] as string | undefined,
        params.format,
      ),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const payload = error.response?.data;

      if (payload instanceof Blob) {
        const text = await payload.text();

        try {
          if (error.response) {
            error.response.data = JSON.parse(text) as typeof error.response.data;
          }
        } catch {
          throw new Error(parseApiError(error).message);
        }
      }
    }

    throw error;
  }
};

export const saveFinanceExport = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
