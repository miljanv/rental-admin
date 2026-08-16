import { describe, expect, it } from 'vitest';

import { listPartnersQuerySchema, partnerWriteSchema } from './partner';

const validCompany = {
  type: 'TRAVEL_AGENCY',
  companyName: 'Sunny Travel doo',
  address: 'Bulevar oslobođenja 1',
  city: 'Novi Sad',
  pib: '123456789',
  registrationNumber: '20123456',
} as const;

const validIndividual = {
  type: 'INDIVIDUAL',
  firstName: 'Marko',
  lastName: 'Marković',
  address: 'Zmaj Jovina 1',
  city: 'Novi Sad',
  personalId: '0101990710123',
} as const;

describe('partnerWriteSchema', () => {
  it('accepts a legal entity with company fields', () => {
    expect(partnerWriteSchema.safeParse(validCompany).success).toBe(true);
  });

  it('accepts an individual with personal fields', () => {
    expect(partnerWriteSchema.safeParse(validIndividual).success).toBe(true);
  });

  it('rejects a legal entity missing PIB', () => {
    const { pib: _pib, ...rest } = validCompany;
    expect(partnerWriteSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a legal entity that also carries personal fields', () => {
    expect(
      partnerWriteSchema.safeParse({ ...validCompany, personalId: '0101990710123' }).success,
    ).toBe(false);
  });

  it('rejects an individual missing JMBG', () => {
    const { personalId: _personalId, ...rest } = validIndividual;
    expect(partnerWriteSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects an individual that also carries company fields', () => {
    expect(
      partnerWriteSchema.safeParse({ ...validIndividual, companyName: 'Should not be here' }).success,
    ).toBe(false);
  });

  it('rejects a PIB that is not exactly 9 digits', () => {
    const result = partnerWriteSchema.safeParse({ ...validCompany, pib: '12345' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.includes('pib'))).toBe(true);
  });

  it('rejects a matični broj that is not exactly 8 digits', () => {
    const result = partnerWriteSchema.safeParse({ ...validCompany, registrationNumber: '123' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.includes('registrationNumber'))).toBe(true);
  });

  it('rejects a JMBG that is not exactly 13 digits', () => {
    const result = partnerWriteSchema.safeParse({ ...validIndividual, personalId: '123' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.includes('personalId'))).toBe(true);
  });

  it('requires a city', () => {
    const { city: _city, ...rest } = validCompany;
    expect(partnerWriteSchema.safeParse(rest).success).toBe(false);
  });

  it('defaults a missing nickname to null', () => {
    const result = partnerWriteSchema.safeParse(validCompany);
    expect(result.success).toBe(true);
    expect(result.data?.nickname).toBeNull();
  });

  it('accepts a nickname', () => {
    const result = partnerWriteSchema.safeParse({ ...validCompany, nickname: 'Tortilje' });
    expect(result.success).toBe(true);
    expect(result.data?.nickname).toBe('Tortilje');
  });

  it('accepts every new partner type', () => {
    for (const type of ['BUS_OPERATOR', 'FACTORY', 'SCHOOL', 'HOTEL', 'MUNICIPALITY'] as const) {
      expect(partnerWriteSchema.safeParse({ ...validCompany, type }).success).toBe(true);
    }
  });
});

describe('listPartnersQuerySchema', () => {
  it('defaults to newest first', () => {
    expect(listPartnersQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      search: undefined,
      type: undefined,
    });
  });
});
