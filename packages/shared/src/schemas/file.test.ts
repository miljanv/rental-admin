import { describe, expect, it } from 'vitest';

import { megabytesToBytes } from '../constants';
import { createPresignUploadRequestSchema, listFilesQuerySchema } from './file';

const schema = createPresignUploadRequestSchema(megabytesToBytes(25));

describe('createPresignUploadRequestSchema', () => {
  it('accepts an allowed file within the limit', () => {
    const result = schema.safeParse({
      originalName: '  report.pdf  ',
      mimeType: 'application/pdf',
      size: 1024,
    });

    expect(result.success).toBe(true);
    expect(result.data?.originalName).toBe('report.pdf');
  });

  it('rejects a file above the configured limit', () => {
    const result = schema.safeParse({
      originalName: 'huge.zip',
      mimeType: 'application/zip',
      size: megabytesToBytes(25) + 1,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('25 MB');
  });

  it('honours a lower per-environment limit', () => {
    const strict = createPresignUploadRequestSchema(megabytesToBytes(1));
    const payload = { originalName: 'a.txt', mimeType: 'text/plain', size: megabytesToBytes(2) };

    expect(strict.safeParse(payload).success).toBe(false);
    expect(schema.safeParse(payload).success).toBe(true);
  });

  it('rejects a disallowed MIME type regardless of the extension', () => {
    const result = schema.safeParse({
      originalName: 'invoice.pdf',
      mimeType: 'application/x-msdownload',
      size: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('This file type is not supported.');
  });

  it.each([
    ['an empty file', { size: 0 }],
    ['a negative size', { size: -1 }],
    ['a fractional size', { size: 10.5 }],
  ])('rejects %s', (_label, override) => {
    const result = schema.safeParse({
      originalName: 'a.txt',
      mimeType: 'text/plain',
      ...override,
    });

    expect(result.success).toBe(false);
  });

  it('rejects an empty or overlong file name', () => {
    expect(schema.safeParse({ originalName: '   ', mimeType: 'text/plain', size: 1 }).success).toBe(
      false,
    );
    expect(
      schema.safeParse({ originalName: 'a'.repeat(256), mimeType: 'text/plain', size: 1 }).success,
    ).toBe(false);
  });
});

describe('listFilesQuerySchema', () => {
  it('applies defaults for an empty query', () => {
    expect(listFilesQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      search: undefined,
      status: undefined,
    });
  });

  it('coerces numeric strings from the query string', () => {
    const parsed = listFilesQuerySchema.parse({ page: '3', limit: '25' });

    expect(parsed.page).toBe(3);
    expect(parsed.limit).toBe(25);
  });

  it('caps the page size and rejects invalid sort fields', () => {
    expect(listFilesQuerySchema.safeParse({ limit: '500' }).success).toBe(false);
    expect(listFilesQuerySchema.safeParse({ sortBy: 'storageKey' }).success).toBe(false);
    expect(listFilesQuerySchema.safeParse({ sortOrder: 'sideways' }).success).toBe(false);
  });

  it('treats a blank search as absent', () => {
    expect(listFilesQuerySchema.parse({ search: '   ' }).search).toBeUndefined();
    expect(listFilesQuerySchema.parse({ search: ' report ' }).search).toBe('report');
  });
});
