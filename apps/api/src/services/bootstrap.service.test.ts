import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockEnv = vi.hoisted(
  (): { SUPERADMIN_USERNAME?: string; SUPERADMIN_PASSWORD?: string } => ({}),
);

vi.mock('../config/env', () => ({ env: mockEnv }));
vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(async (password: string) => `hashed:${password}`) },
}));
vi.mock('../config/prisma', () => ({
  prisma: { user: { findUnique: vi.fn(), create: vi.fn() } },
}));

import { prisma } from '../config/prisma';
import { ensureBootstrapSuperadmin } from './bootstrap.service';

beforeEach(() => {
  vi.clearAllMocks();
  delete mockEnv.SUPERADMIN_USERNAME;
  delete mockEnv.SUPERADMIN_PASSWORD;
  vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.user.create).mockResolvedValue({ id: 'admin-1' } as never);
});

describe('ensureBootstrapSuperadmin', () => {
  it('does nothing when no superadmin is configured', async () => {
    await ensureBootstrapSuperadmin();

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('does nothing when only half of the credentials are set', async () => {
    mockEnv.SUPERADMIN_USERNAME = 'owner@example.com';

    await ensureBootstrapSuperadmin();

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('creates a superadmin with no organization and a hashed password', async () => {
    mockEnv.SUPERADMIN_USERNAME = 'owner@example.com';
    mockEnv.SUPERADMIN_PASSWORD = 'first-password';

    await ensureBootstrapSuperadmin();

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        username: 'owner@example.com',
        passwordHash: 'hashed:first-password',
        role: 'SUPERADMIN',
        organizationId: null,
      },
      select: { id: true },
    });
  });

  it('leaves an existing account untouched, so a rotated password survives restarts', async () => {
    mockEnv.SUPERADMIN_USERNAME = 'owner@example.com';
    mockEnv.SUPERADMIN_PASSWORD = 'first-password';
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'admin-1' } as never);

    await ensureBootstrapSuperadmin();

    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
