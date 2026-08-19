import { describe, expect, it } from 'vitest';

import { JOB_TITLE_MAX_LENGTH, JOB_TITLES, canonicalJobTitle } from './driver';

describe('canonicalJobTitle', () => {
  it('matches an already-saved lowercase title to the pick-list value', () => {
    expect(canonicalJobTitle('vozač autobusa u zemlji i inostranstvu')).toBe(
      'Vozač autobusa u zemlji i inostranstvu',
    );
    expect(canonicalJobTitle('dispečer')).toBe('Dispečer');
  });

  it('returns undefined for a title that is not on the official list', () => {
    expect(canonicalJobTitle('Vozač')).toBeUndefined();
    expect(canonicalJobTitle('Čistačica')).toBeUndefined();
  });
});

describe('JOB_TITLES', () => {
  it('is exactly the six official posts', () => {
    expect([...JOB_TITLES]).toEqual([
      'Vozač autobusa u zemlji i inostranstvu',
      'Vozač autobusa na prevozu radnika u zemlji',
      'Vozač putničkog vozila u zemlji i inostranstvu',
      'Dispečer',
      'Administrativni radnik',
      'Direktor',
    ]);
  });

  it('fits every known title selected at once under the stored max length', () => {
    const joined = JOB_TITLES.join(', ');

    expect(joined.length).toBeLessThanOrEqual(JOB_TITLE_MAX_LENGTH);
  });
});
