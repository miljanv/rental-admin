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

  return { prisma: { user: model(), organization: model() } };
});

import { prisma } from '../config/prisma';
import { createUser, deleteUser, updateUser } from './user.service';

const date = new Date('2026-10-14T00:00:00Z');
const record = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  username: 'marko',
  role: 'USER',
  isActive: true,
  organizationId: 'org-1',
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
});

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

  it('rejects an organization that does not exist', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

    await expect(createUser(input)).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('reports a taken username as a conflict', async () => {
    vi.mocked(prisma.user.create).mockRejectedValue({ code: 'P2002' });

    await expect(createUser(input)).rejects.toMatchObject({ statusCode: 409 });
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

    expect(vi.mocked(prisma.user.update).mock.calls[0]![0].data.passwordHash).toBe(
      'hashed:nova-lozinka',
    );
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

  it('answers 404 for an unknown user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(updateUser('nope', {}, 'admin-1')).rejects.toMatchObject({ statusCode: 404 });
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
