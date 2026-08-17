import { describe, expect, it } from 'vitest';

import { contractWriteSchema, listContractsQuerySchema } from './contract';

const validContract = {
  partnerId: 'partner_1',
  conclusionDate: '2026-08-14',
  origin: 'Novi Sad',
  destination: 'Beč',
  serviceStartDate: '2026-09-01',
  serviceEndDate: '2026-09-03',
  passengerCount: 45,
  price: 250_000,
  advancePercentage: 30,
  status: 'DRAFT',
  clientType: 'TRAVEL_AGENCY',
  clientCompanyName: 'Sunny Travel doo',
  clientAddress: 'Bulevar oslobođenja 1, Novi Sad',
  clientPib: '123456789',
  clientRegistrationNumber: '20123456',
} as const;

describe('contractWriteSchema', () => {
  it('accepts a complete contract for a legal-entity client', () => {
    expect(contractWriteSchema.safeParse(validContract).success).toBe(true);
  });

  it('rejects a service end date before the start date', () => {
    expect(
      contractWriteSchema.safeParse({
        ...validContract,
        serviceStartDate: '2026-09-03',
        serviceEndDate: '2026-09-01',
      }).success,
    ).toBe(false);
  });

  it('accepts a single-day service (same start and end date)', () => {
    expect(
      contractWriteSchema.safeParse({
        ...validContract,
        serviceStartDate: '2026-09-01',
        serviceEndDate: '2026-09-01',
      }).success,
    ).toBe(true);
  });

  it('rejects an advance percentage over 100', () => {
    expect(contractWriteSchema.safeParse({ ...validContract, advancePercentage: 101 }).success).toBe(
      false,
    );
  });

  it('rejects an individual client missing JMBG', () => {
    const { clientCompanyName: _c, clientPib: _p, clientRegistrationNumber: _r, ...rest } = validContract;
    expect(
      contractWriteSchema.safeParse({
        ...rest,
        clientType: 'INDIVIDUAL',
        clientFirstName: 'Marko',
        clientLastName: 'Marković',
      }).success,
    ).toBe(false);
  });

  it('normalizes an empty vehicleId/driverId to null', () => {
    const result = contractWriteSchema.safeParse({ ...validContract, vehicleId: '', driverId: '' });
    expect(result.success).toBe(true);
    expect(result.data?.vehicleId).toBeNull();
    expect(result.data?.driverId).toBeNull();
  });
});

describe('listContractsQuerySchema', () => {
  it('defaults to newest first', () => {
    expect(listContractsQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      search: undefined,
      status: undefined,
      partnerId: undefined,
    });
  });
});
