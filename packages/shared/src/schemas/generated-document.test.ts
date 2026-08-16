import { describe, expect, it } from 'vitest';

import { generateEmploymentContractSchema, generateMaFormSchema } from './generated-document';

const contractBase = {
  employmentContractType: 'INDEFINITE',
  startsAt: '2026-06-16',
  signedAt: '2026-06-15',
  netSalary: 69_000,
  transportAllowance: 2296.5,
  mealAllowance: 500,
  holidayAllowance: 500,
  workplace: 'Novi Sad, Mornarska 57',
  municipality: 'Novi Sad',
  residenceStreet: 'Devet Jugovića 50',
} as const;

describe('generateEmploymentContractSchema', () => {
  it('accepts an indefinite contract without an expiry date', () => {
    const result = generateEmploymentContractSchema.safeParse(contractBase);

    expect(result.success).toBe(true);
    expect(result.data?.expiresAt).toBeNull();
    expect(result.data?.trialPeriodDays).toBe(5);
  });

  it('requires an expiry date for a fixed-term contract', () => {
    const result = generateEmploymentContractSchema.safeParse({
      ...contractBase,
      employmentContractType: 'FIXED_TERM',
    });

    expect(result.success).toBe(false);
  });

  it('accepts a fixed-term contract with an expiry date', () => {
    const result = generateEmploymentContractSchema.safeParse({
      ...contractBase,
      employmentContractType: 'FIXED_TERM',
      expiresAt: '2026-12-31',
    });

    expect(result.success).toBe(true);
  });
});

describe('generateMaFormSchema', () => {
  it('fills citizenship and activity defaults', () => {
    const result = generateMaFormSchema.safeParse({
      gender: 'MALE',
      parentName: 'Petar',
      municipality: 'Novi Sad',
      residenceStreet: 'Mornarska 1',
      insuranceStartDate: '2026-06-16',
      occupation: 'Vozač autobusa',
      qualification: 'III SSS',
      employmentKind: 'PERMANENT',
      workplace: 'Novi Sad',
      companyRegistrationNumber: '12345678',
      activityCode: '4931',
      documentNumber: '12',
      registeredAt: '2026-06-16T09:15',
    });

    expect(result.success).toBe(true);
    expect(result.data?.citizenship).toBe('Republika Srbija');
    expect(result.data?.insuranceBasis).toBe('101');
    expect(result.data?.registrationType).toBe('PRIJAVA');
  });

  it('requires a delovodni broj and vreme zavođenja', () => {
    const result = generateMaFormSchema.safeParse({
      gender: 'MALE',
      parentName: 'Petar',
      municipality: 'Novi Sad',
      residenceStreet: 'Mornarska 1',
      insuranceStartDate: '2026-06-16',
      occupation: 'Vozač autobusa',
      qualification: 'III SSS',
      employmentKind: 'PERMANENT',
      workplace: 'Novi Sad',
      companyRegistrationNumber: '12345678',
      activityCode: '4931',
    });

    expect(result.success).toBe(false);
  });
});
