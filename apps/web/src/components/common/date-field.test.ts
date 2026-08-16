import { describe, expect, it } from 'vitest';

import { isoToMasked, maskDateInput, parseMaskedDate } from './date-field';

describe('isoToMasked', () => {
  it('formats an ISO date as dd.mm.gggg.', () => {
    expect(isoToMasked('1990-01-01')).toBe('01.01.1990.');
  });

  it('returns an empty string for an empty or malformed value', () => {
    expect(isoToMasked('')).toBe('');
    expect(isoToMasked('not-a-date')).toBe('');
  });
});

describe('maskDateInput', () => {
  it('inserts dots after the day and month as digits are typed', () => {
    expect(maskDateInput('0')).toBe('0');
    expect(maskDateInput('01')).toBe('01.');
    expect(maskDateInput('0101')).toBe('01.01.');
    expect(maskDateInput('01011990')).toBe('01.01.1990.');
  });

  it('strips non-digit characters typed by the user or pasted in', () => {
    expect(maskDateInput('01-01-1990')).toBe('01.01.1990.');
  });

  it('caps input at 8 digits', () => {
    expect(maskDateInput('010119904567')).toBe('01.01.1990.');
  });
});

describe('parseMaskedDate', () => {
  it('parses a complete, valid masked date to ISO', () => {
    expect(parseMaskedDate('01.01.1990.')).toBe('1990-01-01');
    expect(parseMaskedDate('01.01.1990')).toBe('1990-01-01');
  });

  it('returns null for an incomplete date', () => {
    expect(parseMaskedDate('01.01.')).toBeNull();
    expect(parseMaskedDate('')).toBeNull();
  });

  it('rejects a calendar date that does not really exist', () => {
    expect(parseMaskedDate('31.02.2026.')).toBeNull();
    expect(parseMaskedDate('29.02.2026.')).toBeNull();
  });

  it('accepts a real leap day', () => {
    expect(parseMaskedDate('29.02.2024.')).toBe('2024-02-29');
  });
});
