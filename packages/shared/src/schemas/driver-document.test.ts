import { describe, expect, it } from 'vitest';

import { driverDocumentWriteSchema, expiringDocumentsQuerySchema } from './driver-document';

const validLicense = {
  type: 'LICENSE',
  documentNumber: 'LIC-001',
  issuedAt: '2024-01-15',
  expiresAt: '2026-01-15',
  employmentContractType: null,
  fileId: null,
} as const;

describe('driverDocumentWriteSchema', () => {
  it('accepts a license with an expiry date', () => {
    expect(driverDocumentWriteSchema.safeParse(validLicense).success).toBe(true);
  });

  it('requires a contract type for an employment contract', () => {
    const result = driverDocumentWriteSchema.safeParse({
      ...validLicense,
      type: 'EMPLOYMENT_CONTRACT',
    });

    expect(result.success).toBe(false);
  });

  it('requires an expiry date for a fixed-term contract', () => {
    const result = driverDocumentWriteSchema.safeParse({
      type: 'EMPLOYMENT_CONTRACT',
      documentNumber: 'UG-1',
      issuedAt: '2024-01-01',
      expiresAt: null,
      employmentContractType: 'FIXED_TERM',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an expiry date on an indefinite contract', () => {
    const result = driverDocumentWriteSchema.safeParse({
      type: 'EMPLOYMENT_CONTRACT',
      documentNumber: 'UG-1',
      issuedAt: '2024-01-01',
      expiresAt: '2026-01-01',
      employmentContractType: 'INDEFINITE',
    });

    expect(result.success).toBe(false);
  });

  it('accepts an indefinite contract without an expiry date', () => {
    const result = driverDocumentWriteSchema.safeParse({
      type: 'EMPLOYMENT_CONTRACT',
      documentNumber: 'UG-1',
      issuedAt: '2024-01-01',
      employmentContractType: 'INDEFINITE',
    });

    expect(result.success).toBe(true);
    expect(result.data?.expiresAt).toBeNull();
  });
});

describe('expiringDocumentsQuerySchema', () => {
  it('defaults to 30 days', () => {
    expect(expiringDocumentsQuerySchema.parse({})).toEqual({ days: 30 });
  });
});
