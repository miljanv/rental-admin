const ACTIVE_ORGANIZATION_STORAGE_KEY = 'rental-admin.active-organization';

/**
 * The organization a superadmin is currently working in. Regular users never
 * have one: the API always uses their own organization.
 */
export const getActiveOrganizationId = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const setActiveOrganizationId = (organizationId: string): void => {
  try {
    window.localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, organizationId);
  } catch {
    // Storage can be blocked; the selection then lasts until the page reloads.
  }
};

export const clearActiveOrganizationId = (): void => {
  try {
    window.localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
};
