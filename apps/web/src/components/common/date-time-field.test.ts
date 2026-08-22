import { describe, expect, it } from 'vitest';

import {
  dateFromDateTimeLocal,
  joinDateTimeLocal,
  maskTimeInput,
  parseMaskedTime,
  splitDateTimeLocal,
} from './date-time-field';

describe('splitDateTimeLocal / joinDateTimeLocal', () => {
  it('splits and joins a wall-clock datetime', () => {
    expect(splitDateTimeLocal('2026-08-22T16:00')).toEqual({ date: '2026-08-22', time: '16:00' });
    expect(joinDateTimeLocal('2026-08-22', '16:00')).toBe('2026-08-22T16:00');
  });

  it('defaults the clock to midnight when only a date is chosen', () => {
    expect(joinDateTimeLocal('2026-08-22', '')).toBe('2026-08-22T00:00');
    expect(joinDateTimeLocal('', '16:00')).toBe('');
  });
});

describe('dateFromDateTimeLocal', () => {
  it('takes the calendar day from a datetime-local value', () => {
    expect(dateFromDateTimeLocal('2026-08-22T16:00')).toBe('2026-08-22');
  });
});

describe('maskTimeInput', () => {
  it('inserts a colon after the hour', () => {
    expect(maskTimeInput('1')).toBe('1');
    expect(maskTimeInput('16')).toBe('16');
    expect(maskTimeInput('1600')).toBe('16:00');
  });
});

describe('parseMaskedTime', () => {
  it('accepts a 24-hour clock', () => {
    expect(parseMaskedTime('00:00')).toBe('00:00');
    expect(parseMaskedTime('16:00')).toBe('16:00');
    expect(parseMaskedTime('23:59')).toBe('23:59');
  });

  it('rejects AM/PM-style hours and incomplete values', () => {
    expect(parseMaskedTime('24:00')).toBeNull();
    expect(parseMaskedTime('16:60')).toBeNull();
    expect(parseMaskedTime('16')).toBeNull();
  });
});
