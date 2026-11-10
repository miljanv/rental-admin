import { API_ERROR_CODES, DRIVER_ACCESS_HEADER } from '@rental-admin/shared';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/driver-access.service', () => ({ findDriverAccess: vi.fn() }));

import { findDriverAccess } from '../services/driver-access.service';
import { getTenantContext } from '../utils/tenant-context';
import { errorHandler } from './error-handler';
import { requireDriverToken } from './require-driver-token';

const buildApp = () => {
  const app = express();
  app.get('/portal', requireDriverToken, (req, res) => {
    res.json({ access: req.driverAccess, tenant: getTenantContext() });
  });
  app.use(errorHandler);
  return app;
};

beforeEach(() => {
  vi.mocked(findDriverAccess).mockReset();
});

describe('requireDriverToken', () => {
  it('rejects a request without a link token', async () => {
    vi.mocked(findDriverAccess).mockResolvedValue(null);

    const response = await request(buildApp()).get('/portal');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(API_ERROR_CODES.DRIVER_LINK_INVALID);
  });

  it("runs the request in the driver's organization with no signed-in user", async () => {
    vi.mocked(findDriverAccess).mockResolvedValue({
      tokenId: 'tok_1',
      driverId: 'drv_1',
      organizationId: 'org_1',
    });

    const response = await request(buildApp())
      .get('/portal')
      .set(DRIVER_ACCESS_HEADER, 'a'.repeat(43));

    expect(response.status).toBe(200);
    expect(response.body.access.driverId).toBe('drv_1');
    expect(response.body.tenant).toEqual({ userId: null, organizationId: 'org_1' });
  });
});
