import { DEFAULT_MAX_FILE_SIZE_BYTES, megabytesToBytes } from '@rental-admin/shared';
import { describe, expect, it } from 'vitest';

import { listFilesQuerySchema, presignUploadBodySchema } from './file.schema';

const validRequest = {
  originalName: 'contract.pdf',
  mimeType: 'application/pdf',
  size: megabytesToBytes(2),
};

describe('presignUploadBodySchema', () => {
  it('accepts an allowed file within the size limit', () => {
    const result = presignUploadBodySchema.safeParse(validRequest);

    expect(result.success).toBe(true);
  });

  it('rejects a file larger than the configured limit', () => {
    const result = presignUploadBodySchema.safeParse({
      ...validRequest,
      size: DEFAULT_MAX_FILE_SIZE_BYTES + 1,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['size']);
    expect(result.error?.issues[0]?.message).toContain('25 MB');
  });

  it('rejects an empty file', () => {
    const result = presignUploadBodySchema.safeParse({ ...validRequest, size: 0 });

    expect(result.success).toBe(false);
  });

  it('rejects a MIME type that is not allow-listed', () => {
    for (const mimeType of [
      'application/x-msdownload',
      'image/svg+xml',
      'video/mp4',
      'text/html',
    ]) {
      const result = presignUploadBodySchema.safeParse({ ...validRequest, mimeType });

      expect(result.success, `${mimeType} must be rejected`).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual(['mimeType']);
    }
  });

  it('accepts every documented file family', () => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
    ];

    for (const mimeType of allowed) {
      expect(
        presignUploadBodySchema.safeParse({ ...validRequest, mimeType }).success,
        `${mimeType} must be accepted`,
      ).toBe(true);
    }
  });

  it('requires a non-empty file name and trims it', () => {
    expect(
      presignUploadBodySchema.safeParse({ ...validRequest, originalName: '   ' }).success,
    ).toBe(false);

    const result = presignUploadBodySchema.safeParse({
      ...validRequest,
      originalName: '  contract.pdf  ',
    });

    expect(result.success).toBe(true);
    expect(result.data?.originalName).toBe('contract.pdf');
  });

  it('rejects a fractional size', () => {
    expect(presignUploadBodySchema.safeParse({ ...validRequest, size: 10.5 }).success).toBe(false);
  });
});

describe('listFilesQuerySchema', () => {
  it('applies defaults for an empty query', () => {
    const result = listFilesQuerySchema.parse({});

    expect(result).toMatchObject({ page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' });
    expect(result.search).toBeUndefined();
  });

  it('coerces numeric strings coming from the query string', () => {
    const result = listFilesQuerySchema.parse({ page: '3', limit: '25' });

    expect(result.page).toBe(3);
    expect(result.limit).toBe(25);
  });

  it('treats a blank search term as absent', () => {
    expect(listFilesQuerySchema.parse({ search: '   ' }).search).toBeUndefined();
  });

  it('rejects out of range pagination and unknown sort fields', () => {
    expect(listFilesQuerySchema.safeParse({ page: 0 }).success).toBe(false);
    expect(listFilesQuerySchema.safeParse({ limit: 500 }).success).toBe(false);
    expect(listFilesQuerySchema.safeParse({ sortBy: 'storageKey' }).success).toBe(false);
    expect(listFilesQuerySchema.safeParse({ sortOrder: 'sideways' }).success).toBe(false);
  });
});
