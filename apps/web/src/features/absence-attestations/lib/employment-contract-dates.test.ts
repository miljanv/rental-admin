import type { DriverDocumentDto } from '@rental-admin/shared';
import { describe, expect, it } from 'vitest';

import { employmentContractDates } from './employment-contract-dates';

const document = (overrides: Partial<DriverDocumentDto>): DriverDocumentDto => ({
  id: 'doc_1',
  driverId: 'drv_1',
  type: 'EMPLOYMENT_CONTRACT',
  documentNumber: '1',
  issuedAt: '2026-04-01',
  expiresAt: null,
  employmentContractType: 'INDEFINITE',
  file: null,
  generationData: { startsAt: '2026-04-03', signedAt: '2026-04-01' },
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
  ...overrides,
});

describe('employmentContractDates', () => {
  it('reads start and signing dates from the latest contract', () => {
    expect(
      employmentContractDates([
        document({
          id: 'old',
          issuedAt: '2025-01-01',
          generationData: { startsAt: '2025-01-02', signedAt: '2025-01-01' },
        }),
        document({ id: 'new', issuedAt: '2026-04-01' }),
      ]),
    ).toEqual({ startsAt: '2026-04-03', signedAt: '2026-04-01' });
  });

  it('returns empty strings when there is no generated contract', () => {
    expect(employmentContractDates([])).toEqual({ startsAt: '', signedAt: '' });
    expect(
      employmentContractDates([
        document({ type: 'MA_FORM', generationData: { signedAt: '2026-04-02' } }),
      ]),
    ).toEqual({ startsAt: '', signedAt: '' });
  });
});
