import type { AuthUserDto, LoginRequest, LoginResult } from '@rental-admin/shared';
import bcrypt from 'bcryptjs';

import { prisma } from '../config/prisma';
import { unauthorized } from '../utils/app-error';
import { signAccessToken } from '../utils/access-token';
import { logger } from '../utils/logger';

/**
 * A real bcrypt hash so a missing user still spends the same time in
 * `bcrypt.compare` as a found user. The plaintext is never a valid password.
 */
const DUMMY_PASSWORD_HASH = '$2b$12$FoQOIfb/5aL1/CU7dp876e7.1.A7x7sovjDjI6PqCUvEIIii4O0NS';

const toAuthUserDto = (user: { id: string; username: string }): AuthUserDto => ({
  id: user.id,
  username: user.username,
});

export const login = async (input: LoginRequest): Promise<LoginResult> => {
  const user = await prisma.user.findUnique({ where: { username: input.username } });
  const passwordMatches = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !passwordMatches) {
    throw unauthorized('Invalid username or password.');
  }

  logger.info('User signed in', { userId: user.id, username: user.username });

  const dto = toAuthUserDto(user);

  return { token: signAccessToken(dto), user: dto };
};

export const getCurrentUser = (user: AuthUserDto): AuthUserDto => user;
