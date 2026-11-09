import type { SignOptions } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { isAppError, unauthorized } from '../utils/app-error';

export interface AccessTokenPayload {
  username: string;
  /** `User.tokenVersion` at sign-in. Raising it on the user revokes every older token. */
  tv: number;
}

/**
 * All a token proves is which account it was issued to. Role and organization
 * are deliberately not in it: `requireAuth` reads them from the database on
 * every request, so a deactivated or demoted user loses access immediately
 * instead of when the token expires.
 */
export interface AccessTokenSubject {
  id: string;
  username: string;
  tokenVersion: number;
}

export const signAccessToken = (user: AccessTokenSubject): string =>
  jwt.sign(
    { username: user.username, tv: user.tokenVersion } satisfies AccessTokenPayload,
    env.JWT_SECRET,
    {
      subject: user.id,
      expiresIn: env.JWT_EXPIRES_IN,
    } as SignOptions,
  );

export const verifyAccessToken = (token: string): AccessTokenSubject => {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);

    if (typeof payload !== 'object' || payload === null) {
      throw unauthorized('Session expired. Please sign in again.');
    }

    const username = 'username' in payload ? payload.username : undefined;
    // Tokens issued before versioning carry no `tv`; they match the starting version.
    const tokenVersion = 'tv' in payload ? payload.tv : 0;
    const id = payload.sub;

    if (
      typeof username !== 'string' ||
      username.length === 0 ||
      typeof id !== 'string' ||
      typeof tokenVersion !== 'number'
    ) {
      throw unauthorized('Session expired. Please sign in again.');
    }

    return { id, username, tokenVersion };
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }

    throw unauthorized('Session expired. Please sign in again.');
  }
};
