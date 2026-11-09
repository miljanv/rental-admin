import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findUnique, compare } = vi.hoisted(() => ({ findUnique: vi.fn(), compare: vi.fn() }));

vi.mock('bcryptjs', () => ({ default: { compare } }));
vi.mock('../config/prisma', () => ({ prisma: { user: { findUnique } } }));
vi.mock('../utils/access-token', () => ({ signAccessToken: () => 'token' }));

import { findActiveAuthUser, login } from './auth.service';

const account = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  username: 'marko',
  role: 'USER',
  isActive: true,
  tokenVersion: 2,
  passwordHash: 'hash',
  organization: { id: 'org-1', name: 'Firma 1', isActive: true },
  ...overrides,
});

const suspended = { organization: { id: 'org-1', name: 'Firma 1', isActive: false } };

beforeEach(() => {
  vi.clearAllMocks();
  compare.mockResolvedValue(true);
});

describe('login', () => {
  it('signs in a user of an active organization', async () => {
    findUnique.mockResolvedValue(account());

    await expect(login({ username: 'marko', password: 'secret' })).resolves.toMatchObject({
      token: 'token',
      user: { organizationId: 'org-1' },
    });
  });

  it('refuses a user of a suspended organization with 403 ORGANIZATION_SUSPENDED', async () => {
    findUnique.mockResolvedValue(account(suspended));

    await expect(login({ username: 'marko', password: 'secret' })).rejects.toMatchObject({
      statusCode: 403,
      code: 'ORGANIZATION_SUSPENDED',
      message: 'Nalog firme je suspendovan. Obratite se administratoru.',
    });
  });

  it('does not reveal the suspension before the password is checked', async () => {
    findUnique.mockResolvedValue(account(suspended));
    compare.mockResolvedValue(false);

    await expect(login({ username: 'marko', password: 'wrong' })).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  });

  it('keeps a deactivated user on 401', async () => {
    findUnique.mockResolvedValue(account({ isActive: false }));

    await expect(login({ username: 'marko', password: 'secret' })).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('lets a superadmin in regardless of organizations', async () => {
    findUnique.mockResolvedValue(account({ role: 'SUPERADMIN', organization: null }));

    await expect(login({ username: 'admin', password: 'secret' })).resolves.toMatchObject({
      user: { role: 'SUPERADMIN', organizationId: null },
    });
  });
});

describe('findActiveAuthUser', () => {
  it('accepts a token with the current version', async () => {
    findUnique.mockResolvedValue(account());

    await expect(findActiveAuthUser('user-1', 2)).resolves.toMatchObject({ id: 'user-1' });
  });

  it('rejects a token issued before the sessions were revoked', async () => {
    findUnique.mockResolvedValue(account());

    await expect(findActiveAuthUser('user-1', 1)).resolves.toBeNull();
  });

  it('rejects a deleted user', async () => {
    findUnique.mockResolvedValue(null);

    await expect(findActiveAuthUser('user-1', 2)).resolves.toBeNull();
  });

  it('ends an existing session when the organization is suspended', async () => {
    findUnique.mockResolvedValue(account(suspended));

    await expect(findActiveAuthUser('user-1', 2)).rejects.toMatchObject({
      statusCode: 403,
      code: 'ORGANIZATION_SUSPENDED',
    });
  });

  it('returns null for a deactivated user', async () => {
    findUnique.mockResolvedValue(account({ isActive: false }));

    await expect(findActiveAuthUser('user-1', 2)).resolves.toBeNull();
  });
});
