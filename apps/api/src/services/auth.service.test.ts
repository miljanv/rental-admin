import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findUnique, update, compare } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  compare: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: { compare, hash: async (password: string) => `hashed:${password}` },
}));
vi.mock('../config/prisma', () => ({ prisma: { user: { findUnique, update } } }));
vi.mock('../utils/access-token', () => ({ signAccessToken: () => 'token' }));
vi.mock('./audit.service', () => ({ recordAuditEvent: vi.fn() }));

import { recordAuditEvent } from './audit.service';
import { changePassword, findActiveAuthUser, login } from './auth.service';

const account = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  username: 'marko',
  role: 'USER',
  isActive: true,
  tokenVersion: 2,
  mustChangePassword: false,
  passwordHash: 'hash',
  organization: { id: 'org-1', name: 'Firma 1', isActive: true },
  ...overrides,
});

const suspended = { organization: { id: 'org-1', name: 'Firma 1', isActive: false } };

beforeEach(() => {
  vi.clearAllMocks();
  compare.mockResolvedValue(true);
  update.mockImplementation(async () => account({ tokenVersion: 3 }));
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

  it('records the time of a successful sign-in', async () => {
    findUnique.mockResolvedValue(account());

    await login({ username: 'marko', password: 'secret' });

    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { lastLoginAt: expect.any(Date) },
    });
  });

  it('logs a successful sign-in', async () => {
    findUnique.mockResolvedValue(account());

    await login({ username: 'marko', password: 'secret' });

    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGIN_SUCCEEDED',
        actorUserId: 'user-1',
        organizationId: 'org-1',
      }),
    );
  });

  it('logs a failed sign-in with the username but never the password', async () => {
    findUnique.mockResolvedValue(null);
    compare.mockResolvedValue(false);

    await expect(login({ username: 'nepoznat', password: 'pokusaj123' })).rejects.toBeDefined();

    const event = vi.mocked(recordAuditEvent).mock.calls[0]![0];
    expect(event).toMatchObject({
      action: 'LOGIN_FAILED',
      actorUserId: null,
      metadata: { username: 'nepoznat', reason: 'INVALID_CREDENTIALS' },
    });
    expect(JSON.stringify(event)).not.toContain('pokusaj123');
  });

  it('logs why a known user was refused', async () => {
    findUnique.mockResolvedValue(account(suspended));

    await expect(login({ username: 'marko', password: 'secret' })).rejects.toBeDefined();

    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGIN_FAILED',
        metadata: { username: 'marko', reason: 'ORGANIZATION_SUSPENDED' },
      }),
    );
  });

  it('does not record a failed sign-in', async () => {
    findUnique.mockResolvedValue(account());
    compare.mockResolvedValue(false);

    await expect(login({ username: 'marko', password: 'wrong' })).rejects.toBeDefined();
    expect(update).not.toHaveBeenCalled();
  });

  it('tells the client a temporary password must be replaced', async () => {
    findUnique.mockResolvedValue(account({ mustChangePassword: true }));

    await expect(login({ username: 'marko', password: 'secret' })).resolves.toMatchObject({
      user: { mustChangePassword: true },
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

describe('changePassword', () => {
  const input = { currentPassword: 'stara-lozinka', newPassword: 'nova-lozinka' };

  it('stores the new hash, clears the forced change and revokes older tokens', async () => {
    findUnique.mockResolvedValue(account({ mustChangePassword: true }));

    await expect(changePassword('user-1', input)).resolves.toMatchObject({ token: 'token' });

    expect(compare).toHaveBeenCalledWith('stara-lozinka', 'hash');
    expect(update.mock.calls[0]![0].data).toEqual({
      passwordHash: 'hashed:nova-lozinka',
      mustChangePassword: false,
      tokenVersion: { increment: 1 },
    });
  });

  it('answers 400, not 401, for a wrong current password', async () => {
    findUnique.mockResolvedValue(account());
    compare.mockResolvedValue(false);

    await expect(changePassword('user-1', input)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Trenutna lozinka nije ispravna.',
    });
    expect(update).not.toHaveBeenCalled();
  });
});
