import { describe, expect, it } from 'vitest';

import { Prisma } from '../generated/prisma/client';
import { toCsvLine } from './csv';

describe('toCsvLine', () => {
  it('writes ISO dates, dot decimals and empty cells for null', () => {
    expect(
      toCsvLine([
        new Date('2026-11-09T08:30:00.000Z'),
        new Prisma.Decimal('1234.50'),
        12.5,
        null,
        true,
      ]),
    ).toBe('2026-11-09T08:30:00.000Z;1234.5;12.5;;true\r\n');
  });

  it('keeps Serbian letters and quotes cells with separators, quotes or line breaks', () => {
    expect(toCsvLine(['Šabac; Čačak', 'Rekao je "đak"', 'red 1\nred 2', 'Žabalj'])).toBe(
      '"Šabac; Čačak";"Rekao je ""đak""";"red 1\nred 2";Žabalj\r\n',
    );
  });

  it('stops text from running as an Excel formula', () => {
    expect(toCsvLine(['=HYPERLINK("x")', '+1', '@SUM(A1)', -5])).toBe(
      `"'=HYPERLINK(""x"")";'+1;'@SUM(A1);-5\r\n`,
    );
  });

  it('writes JSON for structured values', () => {
    expect(toCsvLine([{ days: [1, 2] }])).toBe('"{""days"":[1,2]}"\r\n');
  });
});
