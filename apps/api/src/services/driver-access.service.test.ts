import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, auditMock } = vi.hoisted(() => {
  const mock = {
    driver: { findUnique: vi.fn() },
    driverAccessToken: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  mock.$transaction.mockImplementation((work: (tx: typeof mock) => unknown) => work(mock));

  return { prismaMock: mock, auditMock: vi.fn() };
});

vi.mock('../config/prisma', () => ({ prisma: prismaMock, prismaUnscoped: prismaMock }));
vi.mock('./audit.service', () => ({ recordAuditEvent: auditMock }));
vi.mock('../utils/tenant-context', () => ({ requireOrganizationId: () => 'org_1' }));

import { hashDriverAccessToken } from '../utils/driver-access-token';
import { createDriverAccessLink, findDriverAccess } from './driver-access.service';

const token = 'a'.repeat(43);
const validRow = {
  id: 'tok_1',
  organizationId: 'org_1',
  driverId: 'drv_1',
  revokedAt: null,
  lastUsedAt: new Date(),
  driver: { status: 'ACTIVE', organizationId: 'org_1' },
  organization: { isActive: true },
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation((work: (tx: typeof prismaMock) => unknown) =>
    work(prismaMock),
  );
});

describe('createDriverAccessLink', () => {
  it('revokes the old link and stores only the hash of the new token', async () => {
    prismaMock.driver.findUnique.mockResolvedValue({ id: 'drv_1', status: 'ACTIVE' });
    prismaMock.driverAccessToken.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.driverAccessToken.create.mockResolvedValue({
      id: 'tok_2',
      createdAt: new Date('2026-11-10T09:00:00.000Z'),
    });

    const result = await createDriverAccessLink('drv_1');

    expect(prismaMock.driverAccessToken.updateMany).toHaveBeenCalledWith({
      where: { driverId: 'drv_1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prismaMock.driverAccessToken.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org_1',
        driverId: 'drv_1',
        tokenHash: hashDriverAccessToken(result.token),
      },
      select: { id: true, createdAt: true },
    });
    expect(JSON.stringify(prismaMock.driverAccessToken.create.mock.calls)).not.toContain(
      result.token,
    );
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DRIVER_LINK_CREATED', entityId: 'drv_1' }),
    );
  });

  it('refuses an inactive driver', async () => {
    prismaMock.driver.findUnique.mockResolvedValue({ id: 'drv_1', status: 'INACTIVE' });

    await expect(createDriverAccessLink('drv_1')).rejects.toThrow('Neaktivan vozač');
    expect(prismaMock.driverAccessToken.create).not.toHaveBeenCalled();
  });
});

describe('findDriverAccess', () => {
  it('resolves a valid link to its driver and organization', async () => {
    prismaMock.driverAccessToken.findUnique.mockResolvedValue(validRow);

    await expect(findDriverAccess(token)).resolves.toEqual({
      tokenId: 'tok_1',
      driverId: 'drv_1',
      organizationId: 'org_1',
    });
    expect(prismaMock.driverAccessToken.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: hashDriverAccessToken(token) } }),
    );
  });

  it('records when a link was last used, at most once a minute', async () => {
    prismaMock.driverAccessToken.findUnique.mockResolvedValue({ ...validRow, lastUsedAt: null });
    prismaMock.driverAccessToken.update.mockResolvedValue({});

    await findDriverAccess(token);

    expect(prismaMock.driverAccessToken.update).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['revoked', { revokedAt: new Date() }],
    ['inactive driver', { driver: { status: 'INACTIVE', organizationId: 'org_1' } }],
    ['suspended organization', { organization: { isActive: false } }],
  ])('rejects a %s', async (_label, override) => {
    prismaMock.driverAccessToken.findUnique.mockResolvedValue({ ...validRow, ...override });

    await expect(findDriverAccess(token)).resolves.toBeNull();
  });

  it('rejects an unknown token and never looks up a malformed one', async () => {
    prismaMock.driverAccessToken.findUnique.mockResolvedValue(null);

    await expect(findDriverAccess(token)).resolves.toBeNull();
    await expect(findDriverAccess('not-a-token')).resolves.toBeNull();
    expect(prismaMock.driverAccessToken.findUnique).toHaveBeenCalledTimes(1);
  });
});
