import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(async (password: string) => `hashed:${password}`) },
}));
vi.mock('../config/prisma', () => {
  const model = () =>
    Object.fromEntries(
      ['findUnique', 'findMany', 'create', 'update', 'delete', 'count'].map((name) => [
        name,
        vi.fn(),
      ]),
    );

  const client: Record<string, unknown> = {
    user: model(),
    organization: model(),
    $queryRaw: vi.fn(),
  };
  client.$transaction = vi.fn((callback: (tx: unknown) => unknown) => callback(client));

  return { prisma: client };
});

vi.mock('./audit.service', () => ({ recordAuditEvent: vi.fn() }));

import { prisma } from '../config/prisma';
import { recordAuditEvent } from './audit.service';
import {
  createUser,
  deleteUser,
  resetUserPassword,
  revokeUserSessions,
  updateUser,
} from './user.service';

const date = new Date('2026-10-14T00:00:00Z');
const record = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  username: 'marko',
  role: 'USER',
  isActive: true,
  organizationId: 'org-1',
  mustChangePassword: false,
  lastLoginAt: null,
  createdAt: date,
  updatedAt: date,
  organization: { name: 'Firma 1' },
  _count: { createdVehicles: 3 },
  ...overrides,
});
const noCreatedRecords = {
  createdDrivers: 0,
  createdVehicles: 0,
  createdCompanyExpenses: 0,
  createdSuppliers: 0,
  createdPartners: 0,
  createdContracts: 0,
  createdTransactions: 0,
  createdTrips: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.organization.findUnique).mockResolvedValue({ id: 'org-1' } as never);
  vi.mocked(prisma.user.count).mockResolvedValue(1);
  vi.mocked(prisma.$queryRaw).mockResolvedValue([{ maxVehicles: null, maxUsers: null }] as never);
});

const userLimit = (maxUsers: number, activeUsers: number): void => {
  vi.mocked(prisma.$queryRaw).mockResolvedValue([{ maxVehicles: null, maxUsers }] as never);
  vi.mocked(prisma.user.count).mockResolvedValue(activeUsers);
};

describe('createUser', () => {
  const input = {
    username: 'marko',
    password: 'lozinka123',
    role: 'USER' as const,
    organizationId: 'org-1',
    isActive: true,
  };

  it('stores a hash instead of the password and never returns it', async () => {
    vi.mocked(prisma.user.create).mockResolvedValue(record() as never);

    const dto = await createUser(input);

    const data = vi.mocked(prisma.user.create).mock.calls[0]![0].data;
    expect(data.passwordHash).toBe('hashed:lozinka123');
    expect(JSON.stringify(dto)).not.toContain('lozinka123');
    expect(dto).not.toHaveProperty('passwordHash');
    expect(dto.vehiclesCreated).toBe(3);
  });

  it('makes the new user choose their own password at the first sign-in', async () => {
    vi.mocked(prisma.user.create).mockResolvedValue(record() as never);

    await createUser(input);

    expect(vi.mocked(prisma.user.create).mock.calls[0]![0].data.mustChangePassword).toBe(true);
  });

  it('rejects an organization that does not exist', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

    await expect(createUser(input)).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('reports a taken username as a conflict', async () => {
    vi.mocked(prisma.user.create).mockRejectedValue({ code: 'P2002' });

    await expect(createUser(input)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('creates a user while the organization is below its user limit', async () => {
    userLimit(3, 2);
    vi.mocked(prisma.user.create).mockResolvedValue(record() as never);

    await expect(createUser(input)).resolves.toMatchObject({ id: 'user-1' });
  });

  it('refuses a new active user once the organization is at its limit', async () => {
    userLimit(3, 3);

    await expect(createUser(input)).rejects.toMatchObject({
      statusCode: 409,
      code: 'LIMIT_REACHED',
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('lets a deactivated user in even at the limit, since it takes no seat', async () => {
    userLimit(3, 3);
    vi.mocked(prisma.user.create).mockResolvedValue(record({ isActive: false }) as never);

    await expect(createUser({ ...input, isActive: false })).resolves.toMatchObject({
      isActive: false,
    });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});

describe('updateUser', () => {
  const superadmin = { id: 'admin-2', role: 'SUPERADMIN', isActive: true, organizationId: null };
  const regular = { id: 'user-1', role: 'USER', isActive: true, organizationId: 'org-1' };

  it('keeps the stored password when none is sent', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(regular as never);
    vi.mocked(prisma.user.update).mockResolvedValue(record() as never);

    await updateUser('user-1', { username: 'novo' }, 'admin-1');

    const data = vi.mocked(prisma.user.update).mock.calls[0]![0].data;
    expect(data).not.toHaveProperty('passwordHash');
    expect(data.username).toBe('novo');
  });

  it('hashes a new password', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(regular as never);
    vi.mocked(prisma.user.update).mockResolvedValue(record() as never);

    await updateUser('user-1', { password: 'nova-lozinka' }, 'admin-1');

    const data = vi.mocked(prisma.user.update).mock.calls[0]![0].data;
    expect(data.passwordHash).toBe('hashed:nova-lozinka');
    expect(data.mustChangePassword).toBe(true);
  });

  it('signs the user out everywhere after a password change or deactivation', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(regular as never);
    vi.mocked(prisma.user.update).mockResolvedValue(record() as never);

    await updateUser('user-1', { password: 'nova-lozinka' }, 'admin-1');
    await updateUser('user-1', { isActive: false }, 'admin-1');

    for (const [args] of vi.mocked(prisma.user.update).mock.calls) {
      expect(args.data.tokenVersion).toEqual({ increment: 1 });
    }
  });

  it('keeps sessions for a plain rename', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(regular as never);
    vi.mocked(prisma.user.update).mockResolvedValue(record() as never);

    await updateUser('user-1', { username: 'novo' }, 'admin-1');

    expect(vi.mocked(prisma.user.update).mock.calls[0]![0].data).not.toHaveProperty('tokenVersion');
  });

  it('moves a regular user to another organization', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(regular as never);
    vi.mocked(prisma.user.update).mockResolvedValue(record({ organizationId: 'org-2' }) as never);

    await updateUser('user-1', { organizationId: 'org-2' }, 'admin-1');

    expect(vi.mocked(prisma.user.update).mock.calls[0]![0].data.organizationId).toBe('org-2');
  });

  it('detaches a user from the organization when promoting them to superadmin', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(regular as never);
    vi.mocked(prisma.user.update).mockResolvedValue(record({ role: 'SUPERADMIN' }) as never);

    await updateUser('user-1', { role: 'SUPERADMIN' }, 'admin-1');

    const data = vi.mocked(prisma.user.update).mock.calls[0]![0].data;
    expect(data.role).toBe('SUPERADMIN');
    expect(data.organizationId).toBeNull();
  });

  it('will not make a regular user out of someone with no organization to give', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(superadmin as never);
    vi.mocked(prisma.user.count).mockResolvedValue(1);

    await expect(updateUser('admin-2', { role: 'USER' }, 'admin-1')).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('will not let a superadmin deactivate or demote themselves', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(superadmin as never);

    await expect(updateUser('admin-2', { isActive: false }, 'admin-2')).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('will not deactivate the last active superadmin', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(superadmin as never);
    vi.mocked(prisma.user.count).mockResolvedValue(0);

    await expect(updateUser('admin-2', { isActive: false }, 'admin-1')).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('deactivates a superadmin when another one remains', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(superadmin as never);
    vi.mocked(prisma.user.count).mockResolvedValue(1);
    vi.mocked(prisma.user.update).mockResolvedValue(
      record({ role: 'SUPERADMIN', isActive: false, organizationId: null }) as never,
    );

    await expect(updateUser('admin-2', { isActive: false }, 'admin-1')).resolves.toMatchObject({
      isActive: false,
    });
  });

  it('refuses to reactivate a user when the organization is at its limit', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...regular, isActive: false } as never);
    userLimit(2, 2);

    await expect(updateUser('user-1', { isActive: true }, 'admin-1')).rejects.toMatchObject({
      code: 'LIMIT_REACHED',
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('refuses to move a user into an organization that is at its limit', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(regular as never);
    userLimit(2, 2);

    await expect(
      updateUser('user-1', { organizationId: 'org-2' }, 'admin-1'),
    ).rejects.toMatchObject({ code: 'LIMIT_REACHED' });
  });

  it('edits a user who already holds a seat without checking the limit again', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(regular as never);
    userLimit(2, 2);
    vi.mocked(prisma.user.update).mockResolvedValue(record() as never);

    await expect(updateUser('user-1', { username: 'novo' }, 'admin-1')).resolves.toBeDefined();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(updateUser('nope', {}, 'admin-1')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('user audit trail', () => {
  const regular = { id: 'user-1', role: 'USER', isActive: true, organizationId: 'org-1' };

  it('records a role change and a deactivation separately', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(regular as never);
    vi.mocked(prisma.user.update).mockResolvedValue(
      record({ role: 'SUPERADMIN', isActive: false, organizationId: null }) as never,
    );

    await updateUser('user-1', { role: 'SUPERADMIN', isActive: false }, 'admin-1');

    const actions = vi.mocked(recordAuditEvent).mock.calls.map(([event]) => event.action);
    expect(actions).toEqual(['USER_ROLE_CHANGED', 'USER_DEACTIVATED']);
  });

  it('records nothing for a plain rename', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(regular as never);
    vi.mocked(prisma.user.update).mockResolvedValue(record() as never);

    await updateUser('user-1', { username: 'novo' }, 'admin-1');

    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it('records a password reset against the user and their organization', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-1' } as never);
    vi.mocked(prisma.user.update).mockResolvedValue(record() as never);

    await resetUserPassword('user-1', 'privremena1');

    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_PASSWORD_RESET',
        entityId: 'user-1',
        organizationId: 'org-1',
      }),
    );
  });
});

describe('resetUserPassword', () => {
  it('sets a temporary password, forces a change and signs the user out', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-1' } as never);
    vi.mocked(prisma.user.update).mockResolvedValue(record({ mustChangePassword: true }) as never);

    const dto = await resetUserPassword('user-1', 'privremena1');

    expect(vi.mocked(prisma.user.update).mock.calls[0]![0].data).toEqual({
      passwordHash: 'hashed:privremena1',
      mustChangePassword: true,
      tokenVersion: { increment: 1 },
    });
    expect(dto.mustChangePassword).toBe(true);
    expect(JSON.stringify(dto)).not.toContain('privremena1');
  });

  it('returns 404 for an unknown user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(resetUserPassword('nope', 'privremena1')).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('revokeUserSessions', () => {
  it('raises the token version', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-1' } as never);
    vi.mocked(prisma.user.update).mockResolvedValue(record() as never);

    await revokeUserSessions('user-1');

    expect(vi.mocked(prisma.user.update).mock.calls[0]![0].data).toEqual({
      tokenVersion: { increment: 1 },
    });
  });

  it('returns 404 for an unknown user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(revokeUserSessions('nope')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('deleteUser', () => {
  const deletable = { role: 'USER', isActive: true, _count: noCreatedRecords };

  it('will not delete yourself', async () => {
    await expect(deleteUser('admin-1', 'admin-1')).rejects.toMatchObject({ statusCode: 409 });
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('keeps a user who created records, so history stays attributable', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...deletable,
      _count: { ...noCreatedRecords, createdVehicles: 2 },
    } as never);

    await expect(deleteUser('user-1', 'admin-1')).rejects.toMatchObject({ statusCode: 409 });
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('will not delete the last active superadmin', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...deletable,
      role: 'SUPERADMIN',
    } as never);
    vi.mocked(prisma.user.count).mockResolvedValue(0);

    await expect(deleteUser('admin-2', 'admin-1')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('deletes a user who created nothing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(deletable as never);

    await expect(deleteUser('user-1', 'admin-1')).resolves.toEqual({ id: 'user-1', deleted: true });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
  });
});
