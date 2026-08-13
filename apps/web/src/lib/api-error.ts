import type { ApiErrorBody, ApiErrorResponse } from '@rental-admin/shared';
import axios from 'axios';

export interface ParsedApiError {
  code: string;
  message: string;
  status?: number;
  /** Per-field messages from a validation error, ready to render. */
  fieldMessages: string[];
  isCanceled: boolean;
  isNetworkError: boolean;
}

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';
const NETWORK_MESSAGE = 'Cannot reach the server. Check your connection and try again.';

const isApiErrorResponse = (payload: unknown): payload is ApiErrorResponse => {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const candidate = payload as { success?: unknown; error?: unknown };

  if (candidate.success !== false || typeof candidate.error !== 'object' || !candidate.error) {
    return false;
  }

  const error = candidate.error as { code?: unknown; message?: unknown };

  return typeof error.code === 'string' && typeof error.message === 'string';
};

const extractFieldMessages = (error: ApiErrorBody): string[] => {
  const details = error.details;

  if (typeof details !== 'object' || details === null || !('fieldErrors' in details)) {
    return [];
  }

  const fieldErrors = (details as { fieldErrors: unknown }).fieldErrors;

  if (typeof fieldErrors !== 'object' || fieldErrors === null) {
    return [];
  }

  return Object.values(fieldErrors as Record<string, unknown>)
    .flatMap((messages) => (Array.isArray(messages) ? messages : []))
    .filter((message): message is string => typeof message === 'string');
};

/**
 * Turns anything thrown by Axios or React Query into a shape the UI can render,
 * preferring the API's own error message over a generic one.
 */
export const parseApiError = (error: unknown): ParsedApiError => {
  if (axios.isCancel(error)) {
    return {
      code: 'CANCELED',
      message: 'Upload canceled.',
      fieldMessages: [],
      isCanceled: true,
      isNetworkError: false,
    };
  }

  if (axios.isAxiosError(error)) {
    const payload: unknown = error.response?.data;

    if (isApiErrorResponse(payload)) {
      return {
        code: payload.error.code,
        message: payload.error.message,
        status: error.response?.status,
        fieldMessages: extractFieldMessages(payload.error),
        isCanceled: false,
        isNetworkError: false,
      };
    }

    if (!error.response) {
      return {
        code: 'NETWORK_ERROR',
        message: NETWORK_MESSAGE,
        fieldMessages: [],
        isCanceled: false,
        isNetworkError: true,
      };
    }

    return {
      code: 'HTTP_ERROR',
      message: error.response.status >= 500 ? GENERIC_MESSAGE : error.message,
      status: error.response.status,
      fieldMessages: [],
      isCanceled: false,
      isNetworkError: false,
    };
  }

  return {
    code: 'UNKNOWN',
    message: error instanceof Error && error.message ? error.message : GENERIC_MESSAGE,
    fieldMessages: [],
    isCanceled: false,
    isNetworkError: false,
  };
};

/** Single line suitable for a toast or an inline error message. */
export const getApiErrorMessage = (error: unknown): string => {
  const parsed = parseApiError(error);

  return parsed.fieldMessages.length > 0 ? parsed.fieldMessages.join(' ') : parsed.message;
};
