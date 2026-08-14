import { describe, expect, it } from 'vitest';

import { vehicleDocumentWriteSchema } from './vehicle-document';

describe('vehicleDocumentWriteSchema', () => {
  it('accepts a registration document with no file yet', () => {
    const result = vehicleDocumentWriteSchema.safeParse({ type: 'REGISTRATION' });

    expect(result.success).toBe(true);
    expect(result.data?.issuedAt).toBeNull();
    expect(result.data?.fileId).toBeNull();
  });

  it('normalizes an empty-string fileId to null', () => {
    const result = vehicleDocumentWriteSchema.safeParse({
      type: 'REGISTRATION',
      fileId: '',
      issuedAt: '',
    });

    expect(result.success).toBe(true);
    expect(result.data?.fileId).toBeNull();
    expect(result.data?.issuedAt).toBeNull();
  });

  it('accepts a real fileId and issuedAt', () => {
    const result = vehicleDocumentWriteSchema.safeParse({
      type: 'REGISTRATION',
      issuedAt: '2026-08-14',
      fileId: 'file_1',
    });

    expect(result.success).toBe(true);
    expect(result.data?.fileId).toBe('file_1');
  });
});
