import { API_ERROR_CODES, ORGANIZATION_HEADER, type ApiResponse } from '@rental-admin/shared';
import axios from 'axios';

import { getActiveOrganizationId } from './active-organization';
import { parseApiError } from './api-error';
import { clearAccessToken, emitUnauthorized, getAccessToken, setSignOutNotice } from './auth-token';
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

  // Only a superadmin has one; the API ignores the header for everyone else.
  const organizationId = getActiveOrganizationId();

  if (organizationId) {
    config.headers[ORGANIZATION_HEADER] = organizationId;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const requestUrl = error.config?.url ?? '';

    if (error.response?.status === 401) {
      if (!requestUrl.includes('/auth/login') && !requestUrl.includes('/auth/me')) {
        clearAccessToken();
        emitUnauthorized();
      }
    }

    // The login form shows this error itself; anywhere else the session is over.
    const parsed = parseApiError(error);

    if (
      parsed.code === API_ERROR_CODES.ORGANIZATION_SUSPENDED &&
      !requestUrl.includes('/auth/login')
    ) {
      clearAccessToken();
      setSignOutNotice(parsed.message);
      emitUnauthorized();
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
