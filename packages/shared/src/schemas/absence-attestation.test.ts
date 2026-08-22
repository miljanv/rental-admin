import { describe, expect, it } from 'vitest';

import { generateAbsenceAttestationSchema } from './absence-attestation';

const base = {
  periodFrom: '2026-06-17T19:30',
  periodTo: '2026-06-20T10:00',
  reason: 'LEAVE_OR_REST',
  issuedAt: '2026-06-20',
  startedWorkAt: '2026-04-03',
  contractSignedAt: '2026-04-01',
} as const;

describe('generateAbsenceAttestationSchema', () => {
  it('accepts a rest period and defaults the place', () => {
    const result = generateAbsenceAttestationSchema.safeParse(base);

    expect(result.success).toBe(true);
    expect(result.data?.place).toBe('Novi Sad');
    expect(result.data?.otherReason).toBeNull();
  });

  it('rejects a period that does not move forward', () => {
    const result = generateAbsenceAttestationSchema.safeParse({
      ...base,
      periodTo: '2026-06-17T19:30',
    });

    expect(result.success).toBe(false);
  });

  it('requires a description when the reason is other', () => {
    const missing = generateAbsenceAttestationSchema.safeParse({
      ...base,
      reason: 'OTHER',
    });
    const present = generateAbsenceAttestationSchema.safeParse({
      ...base,
      reason: 'OTHER',
      otherReason: 'Obuka',
    });

    expect(missing.success).toBe(false);
    expect(present.success).toBe(true);
  });
});
