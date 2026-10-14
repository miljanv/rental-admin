import type { AuthUserDto } from '@rental-admin/shared';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/auth.service', () => ({ findActiveAuthUser: vi.fn() }));
vi.mock('../config/prisma', () => ({ prisma: { organization: { findUnique: vi.fn() } } }));

import { prisma } from '../config/prisma';
import { findActiveAuthUser } from '../services/auth.service';
import { signAccessToken } from '../utils/access-token';
import { getTenantContext } from '../utils/tenant-context';
import { errorHandler } from './error-handler';
import { requireAuth, requireRole } from './require-auth';

const regularUser: AuthUserDto = {
  id: 'user-1',
  username: 'marko',
  role: 'USER',
  organizationId: 'org-1',
  organizationName: 'Firma 1',
};
const otherUser: AuthUserDto = {
  id: 'user-2',
  username: 'jelena',
  role: 'USER',
  organizationId: 'org-2',
  organizationName: 'Firma 2',
};
const superadmin: AuthUserDto = {
  id: 'admin-1',
  username: 'owner@example.com',
  role: 'SUPERADMIN',
  organizationId: null,
  organizationName: null,
};

const bearer = (user: AuthUserDto): { Authorization: string } => ({
  Authorization: `Bearer ${signAccessToken(user)}`,
});

const app = express();
// Reads the tenant context after an async hop, as a real service would.
app.get('/context', requireAuth, async (_req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 5));
  res.json({ context: getTenantContext() ?? null });
});
app.get('/admin', requireAuth, requireRole('SUPERADMIN'), (_req, res) => {
  res.json({ ok: true });
});
app.use(errorHandler);

const knownUsers = new Map([regularUser, otherUser, superadmin].map((user) => [user.id, user]));

beforeEach(() => {
  vi.mocked(findActiveAuthUser).mockImplementation(async (id) => knownUsers.get(id) ?? null);
  vi.mocked(prisma.organization.findUnique).mockReset();
});

describe('requireAuth', () => {
  it('rejects a request without a token', async () => {
    const response = await request(app).get('/context');

    expect(response.status).toBe(401);
  });

  it('rejects a valid token whose account is gone or deactivated', async () => {
    vi.mocked(findActiveAuthUser).mockResolvedValue(null);

    const response = await request(app).get('/context').set(bearer(regularUser));

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('limits a regular user to their own organization', async () => {
    const response = await request(app).get('/context').set(bearer(regularUser));

    expect(response.status).toBe(200);
    expect(response.body.context).toEqual({ userId: 'user-1', organizationId: 'org-1' });
  });

  it('ignores the organization header for a regular user', async () => {
    const response = await request(app)
      .get('/context')
      .set(bearer(regularUser))
      .set('X-Organization-Id', 'org-2');

    expect(response.body.context.organizationId).toBe('org-1');
    expect(prisma.organization.findUnique).not.toHaveBeenCalled();
  });

  it('gives a superadmin no organization until one is chosen', async () => {
    const response = await request(app).get('/context').set(bearer(superadmin));

    expect(response.body.context).toEqual({ userId: 'admin-1', organizationId: null });
  });

  it('lets a superadmin act inside a chosen organization', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({ id: 'org-2' } as never);

    const response = await request(app)
      .get('/context')
      .set(bearer(superadmin))
      .set('X-Organization-Id', 'org-2');

    expect(response.body.context).toEqual({ userId: 'admin-1', organizationId: 'org-2' });
  });

  it('rejects a superadmin choosing an organization that does not exist', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

    const response = await request(app)
      .get('/context')
      .set(bearer(superadmin))
      .set('X-Organization-Id', 'missing');

    expect(response.status).toBe(404);
  });

  it('keeps concurrent requests of different organizations apart', async () => {
    const responses = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        request(app)
          .get('/context')
          .set(bearer(index % 2 === 0 ? regularUser : otherUser)),
      ),
    );

    responses.forEach((response, index) => {
      expect(response.body.context.organizationId).toBe(index % 2 === 0 ? 'org-1' : 'org-2');
    });
  });

  it('has no tenant context outside a request', () => {
    expect(getTenantContext()).toBeUndefined();
  });
});

describe('requireRole', () => {
  it('forbids a regular user from a superadmin route', async () => {
    const response = await request(app).get('/admin').set(bearer(regularUser));

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('lets a superadmin through', async () => {
    const response = await request(app).get('/admin').set(bearer(superadmin));

    expect(response.status).toBe(200);
  });
});
