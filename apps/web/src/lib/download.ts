import axios from 'axios';

import { parseApiError } from '@/lib/api-error';

/** The file name the API set in `Content-Disposition`, or `fallback`. */
export const fileNameFromDisposition = (header: string | undefined, fallback: string): string => {
  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(header ?? '');

  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }

  const asciiMatch = /filename="([^"]+)"/i.exec(header ?? '');

  return asciiMatch?.[1] ?? fallback;
};

/**
 * A request made with `responseType: 'blob'` gets its JSON error envelope as a
 * Blob too; turn it back into JSON so `getApiErrorMessage` can read it.
 */
export const readBlobError = async (error: unknown): Promise<unknown> => {
  if (!axios.isAxiosError(error) || !(error.response?.data instanceof Blob)) {
    return error;
  }

  const text = await error.response.data.text();

  try {
    error.response.data = JSON.parse(text) as unknown;

    return error;
  } catch {
    return new Error(parseApiError(error).message);
  }
};

export const saveBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
