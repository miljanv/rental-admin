const ACCESS_TOKEN_STORAGE_KEY = 'rental-admin.access-token';

const UNAUTHORIZED_EVENT = 'rental-admin:unauthorized';

export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
};

export const setAccessToken = (token: string): void => {
  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
};

export const clearAccessToken = (): void => {
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
};

export const emitUnauthorized = (): void => {
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
};

export const subscribeUnauthorized = (onUnauthorized: () => void): (() => void) => {
  window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);

  return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
};
