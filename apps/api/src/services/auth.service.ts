import type {
  AuthUserDto,
  ChangePasswordRequest,
  LoginRequest,
  LoginResult,
} from '@rental-admin/shared';
import bcrypt from 'bcryptjs';

import { prisma } from '../config/prisma';
import { badRequest, notFound, organizationSuspended, unauthorized } from '../utils/app-error';
import { signAccessToken } from '../utils/access-token';
import { logger } from '../utils/logger';
import { recordAuditEvent } from './audit.service';
import { hashPassword } from './user.service';

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
  tokenVersion: true,
  mustChangePassword: true,
  organization: { select: { id: true, name: true, isActive: true } },
} as const;

interface AuthUserRecord {
  id: string;
  username: string;
  role: AuthUserDto['role'];
  isActive: boolean;
  tokenVersion: number;
  mustChangePassword: boolean;
  organization: { id: string; name: string; isActive: boolean } | null;
}

const toAuthUserDto = (user: AuthUserRecord): AuthUserDto => ({
  id: user.id,
  username: user.username,
  role: user.role,
  organizationId: user.organization?.id ?? null,
  organizationName: user.organization?.name ?? null,
  mustChangePassword: user.mustChangePassword,
});

type LoginFailure = 'INVALID_CREDENTIALS' | 'USER_INACTIVE' | 'ORGANIZATION_SUSPENDED';

/** Never stores the password that was tried, only who tried and why it failed. */
const recordLoginFailure = (
  username: string,
  reason: LoginFailure,
  user: { id: string; organization: { id: string } | null } | null,
): Promise<void> =>
  recordAuditEvent({
    action: 'LOGIN_FAILED',
    entityType: 'User',
    entityId: user?.id ?? null,
    actorUserId: user?.id ?? null,
    organizationId: user?.organization?.id ?? null,
    metadata: { username, reason },
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
    await recordLoginFailure(input.username, 'INVALID_CREDENTIALS', user);
    throw unauthorized('Pogrešno korisničko ime ili lozinka.');
  }

  if (!user.isActive) {
    await recordLoginFailure(input.username, 'USER_INACTIVE', user);
    throw unauthorized('Nalog je deaktiviran. Obratite se administratoru.');
  }

  if (user.organization !== null && !user.organization.isActive) {
    await recordLoginFailure(input.username, 'ORGANIZATION_SUSPENDED', user);
  }

  assertOrganizationActive(user);

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  logger.info('User signed in', { userId: user.id, username: user.username });
  await recordAuditEvent({
    action: 'LOGIN_SUCCEEDED',
    entityType: 'User',
    entityId: user.id,
    actorUserId: user.id,
    organizationId: user.organization?.id ?? null,
    metadata: { username: user.username },
  });

  return { token: signAccessToken(user), user: toAuthUserDto(user) };
};

/**
 * Replaces the signed-in user's password. Every older token stops working, so the
 * caller gets a fresh one for the current device.
 */
export const changePassword = async (
  userId: string,
  input: ChangePasswordRequest,
): Promise<LoginResult> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) {
    throw notFound('Korisnik nije pronađen.');
  }

  // 400, not 401: a wrong current password must not sign the user out.
  if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
    throw badRequest('Trenutna lozinka nije ispravna.');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(input.newPassword),
      mustChangePassword: false,
      tokenVersion: { increment: 1 },
    },
    select: authUserSelect,
  });
  logger.info('User changed password', { userId });
  await recordAuditEvent({
    action: 'PASSWORD_CHANGED',
    entityType: 'User',
    entityId: userId,
    actorUserId: userId,
    organizationId: updated.organization?.id ?? null,
  });

  return { token: signAccessToken(updated), user: toAuthUserDto(updated) };
};

/**
 * Loads the account behind a verified token. Returns null when it no longer
 * exists, is deactivated, or the token was revoked, which `requireAuth` reports
 * as an expired session. A suspended organization throws instead, so the client
 * can say why.
 */
export const findActiveAuthUser = async (
  id: string,
  tokenVersion: number,
): Promise<AuthUserDto | null> => {
  const user = await prisma.user.findUnique({ where: { id }, select: authUserSelect });

  if (!user || !user.isActive || user.tokenVersion !== tokenVersion) {
    return null;
  }

  assertOrganizationActive(user);

  return toAuthUserDto(user);
};

export const getCurrentUser = (user: AuthUserDto): AuthUserDto => user;
