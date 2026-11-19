import { describe, expect, it } from 'vitest';

import { paymentCardWriteSchema } from './payment-card';
import { optionalTimeOfDay } from './trip';

describe('paymentCardWriteSchema', () => {
  it('trims the name and defaults to an active card', () => {
    expect(paymentCardWriteSchema.parse({ name: '  OMV kartica ' })).toEqual({
      name: 'OMV kartica',
      isActive: true,
    });
  });

  it('rejects a name that is too short', () => {
    expect(paymentCardWriteSchema.safeParse({ name: 'X' }).success).toBe(false);
  });
});

describe('optionalTimeOfDay', () => {
  it('keeps a 24-hour time and treats an empty field as not given', () => {
    expect(optionalTimeOfDay.parse('07:30')).toBe('07:30');
    expect(optionalTimeOfDay.parse('')).toBeNull();
    expect(optionalTimeOfDay.safeParse('25:00').success).toBe(false);
  });
});
