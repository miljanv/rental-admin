import { describe, expect, it } from 'vitest';

import {
  formatAetrDateTime,
  formatSerbianDate,
  formatSerbianMoney,
  formatSlashDate,
  formatSlashDateTime,
  parseDateTimeLocal,
  splitStreetAndNumber,
} from './format';

describe('PDF format helpers', () => {
  it('formats a Serbian numeric date', () => {
    expect(formatSerbianDate('2026-06-16')).toBe('16.06.2026.');
  });

  it('formats money with a decimal comma', () => {
    expect(formatSerbianMoney(69_000)).toBe('69.000,00');
    expect(formatSerbianMoney(2296.5)).toBe('2.296,50');
  });

  it('formats an AETR clock stamp', () => {
    expect(formatAetrDateTime('2026-06-17T19:30')).toBe('19:30h 17/06/2026');
  });

  it('parses a datetime-local value as UTC wall clock', () => {
    expect(parseDateTimeLocal('2026-06-17T19:30').toISOString()).toBe('2026-06-17T19:30:00.000Z');
  });

  it('formats a CROSO slash date', () => {
    expect(formatSlashDate('1998-08-10')).toBe('10/08/1998');
  });

  it('formats a CROSO slash datetime', () => {
    expect(formatSlashDateTime('2026-06-16T09:15')).toBe('16/06/2026 09:15:00');
  });

  it('splits a street and house number', () => {
    expect(splitStreetAndNumber('Devet Jugovića 50')).toEqual({
      street: 'Devet Jugovića',
      number: '50',
    });
    expect(splitStreetAndNumber('Mornarska 57/1/5')).toEqual({
      street: 'Mornarska',
      number: '57/1/5',
    });
  });
});
