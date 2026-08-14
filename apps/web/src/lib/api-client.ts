import type { ApiResponse } from '@rental-admin/shared';
import axios from 'axios';

import { clearAccessToken, emitUnauthorized, getAccessToken } from './auth-token';
import { clientEnv } from './env';

/**
 * Single Axios instance for the API. The base URL always comes from the
 * environment, so no endpoint is ever hardcoded in a component.
 */
export const apiClient = axios.create({
  baseURL: clientEnv.apiUrl,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const requestUrl = error.config?.url ?? '';

      if (!requestUrl.includes('/auth/login') && !requestUrl.includes('/auth/me')) {
        clearAccessToken();
        emitUnauthorized();
      }
    }

    return Promise.reject(error);
  },
);

/**
 * Separate client for direct-to-S3 transfers. It must not carry the API base URL
 * or any application headers: the presigned URL is signed for an exact set of
 * headers, and an extra one invalidates the signature.
 */
export const storageClient = axios.create({
  timeout: 0,
  transformRequest: [(data: unknown) => data],
});

// Axios defaults include `Accept`, which triggers a CORS preflight. S3 only
// needs the signed `Content-Type`; extra request headers fail the bucket CORS
// rule unless AllowedHeaders is a wildcard.
storageClient.defaults.headers.common = {};

/** Unwraps the `{ success, data }` envelope. */
export const unwrap = <TData>(payload: ApiResponse<TData>): TData => {
  if (!payload.success) {
    throw new Error(payload.error.message);
  }

  return payload.data;
};
