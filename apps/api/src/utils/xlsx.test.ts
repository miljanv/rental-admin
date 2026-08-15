import { describe, expect, it } from 'vitest';

import { buildXlsx } from './xlsx';

describe('buildXlsx', () => {
  it('writes a zip that contains sheet names and cell values as plaintext', () => {
    const buffer = buildXlsx([
      {
        name: 'Pregled',
        rows: [
          ['Pokazatelj', 'Iznos'],
          ['Prihod', 12_500.5],
          ['Keš', null],
        ],
      },
      { name: 'Transakcije', rows: [['Datum', '2026-08-15']] },
    ]);

    expect(buffer.subarray(0, 2).toString('latin1')).toBe('PK');
    const body = buffer.toString('utf8');
    expect(body).toContain('sheet name="Pregled"');
    expect(body).toContain('sheet name="Transakcije"');
    expect(body).toContain('Prihod');
    expect(body).toContain('12500.5');
  });
});
