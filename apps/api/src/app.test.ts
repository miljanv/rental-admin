import { megabytesToBytes } from '@rental-admin/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from './app';

const PRESIGN_URL = '/api/v1/files/presign-upload';

describe('API request pipeline', () => {
  it('answers an unknown route with the standard error envelope', async () => {
    const response = await request(app).get('/api/v1/does-not-exist');

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
      .send({ originalName: 'huge.zip', mimeType: 'application/zip', size: megabytesToBytes(26) });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.fieldErrors.size[0]).toContain('25 MB');
  });

  it('rejects a MIME type that is not allow-listed', async () => {
    const response = await request(app)
      .post(PRESIGN_URL)
      .send({ originalName: 'malware.exe', mimeType: 'application/x-msdownload', size: 1024 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.part).toBe('body');
    expect(response.body.error.details.fieldErrors.mimeType).toBeDefined();
  });

  it('rejects a malformed list query', async () => {
    const response = await request(app).get('/api/v1/files?page=0&limit=9000');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.part).toBe('query');
  });

  it('does not advertise the server implementation', async () => {
    const response = await request(app).get('/api/v1/does-not-exist');

    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});
