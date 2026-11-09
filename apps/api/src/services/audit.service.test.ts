import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/prisma', () => ({
  prismaUnscoped: {
    auditEvent: { create: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    financeAuditEvent: { count: vi.fn(), findMany: vi.fn() },
  },
}));
vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { AUDIT_ACTIONS } from '@rental-admin/shared';

import { prismaUnscoped } from '../config/prisma';
import { AuditAction } from '../generated/prisma/enums';
import { logger } from '../utils/logger';
import { runWithRequestContext } from '../utils/request-context';
import { runWithTenant } from '../utils/tenant-context';
import { listAuditEvents, recordAuditEvent, sanitizeAuditMetadata } from './audit.service';

beforeEach(() => {
  vi.clearAllMocks();
});

const createdData = () => vi.mocked(prismaUnscoped.auditEvent.create).mock.calls[0]![0].data;

describe('recordAuditEvent', () => {
  it('fills in the actor, organization, IP and user agent of the request', async () => {
    await runWithRequestContext({ ip: '203.0.113.7', userAgent: 'Firefox' }, () =>
      runWithTenant({ userId: 'user-1', organizationId: 'org-1' }, () =>
        recordAuditEvent({ action: 'VEHICLE_CREATED', entityType: 'Vehicle', entityId: 'veh-1' }),
      ),
    );

    expect(createdData()).toMatchObject({
      action: 'VEHICLE_CREATED',
      entityType: 'Vehicle',
      entityId: 'veh-1',
      actorUserId: 'user-1',
      organizationId: 'org-1',
      ip: '203.0.113.7',
      metadata: { userAgent: 'Firefox' },
    });
  });

  it('lets the caller name the organization, or none', async () => {
    await runWithTenant({ userId: 'admin-1', organizationId: null }, () =>
      recordAuditEvent({
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: 'user-2',
        organizationId: 'org-2',
      }),
    );

    expect(createdData()).toMatchObject({ actorUserId: 'admin-1', organizationId: 'org-2' });
  });

  it('never fails the action when the log cannot be written', async () => {
    vi.mocked(prismaUnscoped.auditEvent.create).mockRejectedValue(new Error('database down'));

    await expect(
      recordAuditEvent({ action: 'LOGIN_SUCCEEDED', entityType: 'User', entityId: 'user-1' }),
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });

  it('keeps secrets out of the metadata', async () => {
    await recordAuditEvent({
      action: 'LOGIN_FAILED',
      entityType: 'User',
      metadata: { username: 'marko', password: 'tajna123', nested: { storageKey: 'org/1/x.pdf' } },
    });

    expect(JSON.stringify(createdData().metadata)).not.toMatch(/tajna123|org\/1\/x\.pdf/);
    expect(createdData().metadata).toMatchObject({ username: 'marko' });
  });
});

describe('sanitizeAuditMetadata', () => {
  it('drops credential-like keys at any depth and serializes dates', () => {
    expect(
      sanitizeAuditMetadata({
        token: 'x',
        passwordHash: 'y',
        list: [{ refreshToken: 'z', ok: 1 }],
        at: new Date('2026-11-09T00:00:00Z'),
      }),
    ).toEqual({ list: [{ ok: 1 }], at: '2026-11-09T00:00:00.000Z' });
  });
});

describe('listAuditEvents', () => {
  it('filters by organization, user, action and inclusive period, newest first', async () => {
    vi.mocked(prismaUnscoped.auditEvent.count).mockResolvedValue(0);
    vi.mocked(prismaUnscoped.auditEvent.findMany).mockResolvedValue([]);

    await listAuditEvents({
      page: 2,
      limit: 10,
      organizationId: 'org-1',
      actorUserId: 'user-1',
      action: 'LOGIN_FAILED',
      from: '2026-11-01',
      to: '2026-11-09',
    });

    const args = vi.mocked(prismaUnscoped.auditEvent.findMany).mock.calls[0]![0]!;
    expect(args.where).toEqual({
      organizationId: 'org-1',
      actorUserId: 'user-1',
      action: 'LOGIN_FAILED',
      createdAt: {
        gte: new Date('2026-11-01T00:00:00.000Z'),
        lt: new Date('2026-11-10T00:00:00.000Z'),
      },
    });
    expect(args.skip).toBe(10);
    expect(args.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
  });
});

describe('audit actions', () => {
  it('match between the database enum and the shared list', () => {
    expect([...AUDIT_ACTIONS].sort()).toEqual(Object.values(AuditAction).sort());
  });
});
