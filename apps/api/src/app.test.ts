import { megabytesToBytes } from '@rental-admin/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from './app';
import { testAuthHeader } from './test/auth-header';

const PRESIGN_URL = '/api/v1/files/presign-upload';
const auth = testAuthHeader();

describe('API request pipeline', () => {
  it('answers an unknown route with the standard error envelope', async () => {
    const response = await request(app).get('/api/v1/does-not-exist').set(auth);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route GET /api/v1/does-not-exist does not exist',
      },
    });
  });

  it('rejects a file above the size limit before any S3 call', async () => {
    const response = await request(app)
      .post(PRESIGN_URL)
      .set(auth)
      .send({ originalName: 'huge.zip', mimeType: 'application/zip', size: megabytesToBytes(26) });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.fieldErrors.size[0]).toContain('25 MB');
  });

  it('rejects a MIME type that is not allow-listed', async () => {
    const response = await request(app)
      .post(PRESIGN_URL)
      .set(auth)
      .send({ originalName: 'malware.exe', mimeType: 'application/x-msdownload', size: 1024 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.part).toBe('body');
    expect(response.body.error.details.fieldErrors.mimeType).toBeDefined();
  });

  it('rejects a malformed list query', async () => {
    const response = await request(app).get('/api/v1/files?page=0&limit=9000').set(auth);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.part).toBe('query');
  });

  it('does not advertise the server implementation', async () => {
    const response = await request(app).get('/api/v1/does-not-exist').set(auth);

    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('rejects file routes without a bearer token', async () => {
    const response = await request(app).get('/api/v1/files');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a malformed access token', async () => {
    const response = await request(app)
      .get('/api/v1/files')
      .set({ Authorization: 'Bearer not-a-jwt' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a login body with a blank password', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: '' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects driver routes without a bearer token', async () => {
    const response = await request(app).get('/api/v1/drivers');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects an incomplete driver payload', async () => {
    const response = await request(app)
      .post('/api/v1/drivers')
      .set(auth)
      .send({ firstName: 'Marko' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an incomplete driver document payload', async () => {
    const response = await request(app)
      .post('/api/v1/drivers/drv_1/documents')
      .set(auth)
      .send({ type: 'LICENSE' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a work-records range that does not move forward', async () => {
    const response = await request(app)
      .get('/api/v1/drivers/drv_1/work-records?from=2026-08-31&to=2026-08-01')
      .set(auth);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a status-overview request without a bearer token', async () => {
    const response = await request(app).get('/api/v1/drivers/drv_1/status-overview');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects an expiring-documents window outside the allowed range', async () => {
    const response = await request(app)
      .get('/api/v1/drivers/expiring-documents?days=0')
      .set(auth);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an incomplete employment-contract generate payload', async () => {
    const response = await request(app)
      .post('/api/v1/drivers/drv_1/generated-documents/employment-contract')
      .set(auth)
      .send({ employmentContractType: 'INDEFINITE' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an absence attestation whose period does not move forward', async () => {
    const response = await request(app)
      .post('/api/v1/drivers/drv_1/absence-attestations')
      .set(auth)
      .send({
        periodFrom: '2026-06-17T19:30',
        periodTo: '2026-06-17T19:30',
        reason: 'LEAVE_OR_REST',
        issuedAt: '2026-06-20',
        startedWorkAt: '2026-04-03',
        contractSignedAt: '2026-04-01',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
