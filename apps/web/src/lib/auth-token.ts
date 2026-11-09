const ACCESS_TOKEN_STORAGE_KEY = 'rental-admin.access-token';

const UNAUTHORIZED_EVENT = 'rental-admin:unauthorized';

const SIGN_OUT_NOTICE_STORAGE_KEY = 'rental-admin.sign-out-notice';

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

/** Why the user was signed out, shown once on the login screen. */
export const setSignOutNotice = (message: string): void => {
  window.sessionStorage.setItem(SIGN_OUT_NOTICE_STORAGE_KEY, message);
};

export const getSignOutNotice = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.sessionStorage.getItem(SIGN_OUT_NOTICE_STORAGE_KEY);
};

export const clearSignOutNotice = (): void => {
  window.sessionStorage.removeItem(SIGN_OUT_NOTICE_STORAGE_KEY);
};

export const emitUnauthorized = (): void => {
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
};

export const subscribeUnauthorized = (onUnauthorized: () => void): (() => void) => {
  window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);

  return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
};
