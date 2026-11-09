import type { AuthUserDto, LoginRequest, LoginResult } from '@rental-admin/shared';
import bcrypt from 'bcryptjs';

import { prisma } from '../config/prisma';
import { organizationSuspended, unauthorized } from '../utils/app-error';
import { signAccessToken } from '../utils/access-token';
import { logger } from '../utils/logger';

/**
 * A real bcrypt hash so a missing user still spends the same time in
 * `bcrypt.compare` as a found user. The plaintext is never a valid password.
 */
const DUMMY_PASSWORD_HASH = '$2b$12$FoQOIfb/5aL1/CU7dp876e7.1.A7x7sovjDjI6PqCUvEIIii4O0NS';

const authUserSelect = {
  id: true,
  username: true,
  role: true,
  isActive: true,
  organization: { select: { id: true, name: true, isActive: true } },
} as const;

interface AuthUserRecord {
  id: string;
  username: string;
  role: AuthUserDto['role'];
  isActive: boolean;
  organization: { id: string; name: string; isActive: boolean } | null;
}

const toAuthUserDto = (user: AuthUserRecord): AuthUserDto => ({
  id: user.id,
  username: user.username,
  role: user.role,
  organizationId: user.organization?.id ?? null,
  organizationName: user.organization?.name ?? null,
});

/** Throws when the user's organization is suspended. A superadmin has no organization. */
const assertOrganizationActive = (user: AuthUserRecord): void => {
  if (user.organization !== null && !user.organization.isActive) {
    throw organizationSuspended();
  }
};

export const login = async (input: LoginRequest): Promise<LoginResult> => {
  const user = await prisma.user.findUnique({
    where: { username: input.username },
    select: { ...authUserSelect, passwordHash: true },
  });
  const passwordMatches = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !passwordMatches) {
    throw unauthorized('Pogrešno korisničko ime ili lozinka.');
  }

  if (!user.isActive) {
    throw unauthorized('Nalog je deaktiviran. Obratite se administratoru.');
  }

  assertOrganizationActive(user);

  logger.info('User signed in', { userId: user.id, username: user.username });

  return { token: signAccessToken(user), user: toAuthUserDto(user) };
};

/**
 * Loads the account behind a verified token. Returns null when it no longer
 * exists or is deactivated, which `requireAuth` reports as an expired session.
 * A suspended organization throws instead, so the client can say why.
 */
export const findActiveAuthUser = async (id: string): Promise<AuthUserDto | null> => {
  const user = await prisma.user.findUnique({ where: { id }, select: authUserSelect });

  if (!user || !user.isActive) {
    return null;
  }

  assertOrganizationActive(user);

  return toAuthUserDto(user);
};

export const getCurrentUser = (user: AuthUserDto): AuthUserDto => user;
