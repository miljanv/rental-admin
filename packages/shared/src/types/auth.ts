export const USER_ROLES = ['SUPERADMIN', 'USER'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  SUPERADMIN: 'Superadmin',
  USER: 'Korisnik',
};

/**
 * Request header a SUPERADMIN sends to act inside one organization. Ignored for
 * every other role, whose organization always comes from the account itself.
 */
export const ORGANIZATION_HEADER = 'X-Organization-Id';

export interface AuthUserDto {
  id: string;
  username: string;
  role: UserRole;
  /** The user's own organization. Null for a SUPERADMIN. */
  organizationId: string | null;
  organizationName: string | null;
}

export interface LoginResult {
  token: string;
  user: AuthUserDto;
}
