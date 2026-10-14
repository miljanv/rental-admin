import { describe, expect, it } from 'vitest';

import { sortAlphabetically } from '@/lib/sort-options';

describe('sortAlphabetically', () => {
  it('sorts visible labels naturally without mutating the source array', () => {
    const source = [
      { id: '10', label: 'Vozilo 10' },
      { id: '2', label: 'vozilo 2' },
      { id: '1', label: 'Autobus 1' },
    ];

    expect(sortAlphabetically(source, (item) => item.label).map((item) => item.id)).toEqual([
      '1',
      '2',
      '10',
    ]);
    expect(source.map((item) => item.id)).toEqual(['10', '2', '1']);
  });
});
