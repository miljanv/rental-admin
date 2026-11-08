import type { PartnerDto } from '@rental-admin/shared';
import { describe, expect, it } from 'vitest';

import { findPartnerByName, partnerPickerLabel, sortPartnersForPicker } from './partner';

const partner = (overrides: Partial<PartnerDto>): PartnerDto =>
  ({
    id: 'p1',
    type: 'SPORTS_CLUB',
    companyName: 'RVAČKI SAVEZ SRBIJE',
    firstName: null,
    lastName: null,
    nickname: null,
    ...overrides,
  }) as PartnerDto;

describe('findPartnerByName', () => {
  it('matches the legal name regardless of case and extra spaces', () => {
    const partners = [partner({})];

    expect(findPartnerByName(partners, '  rvački   savez srbije ')?.id).toBe('p1');
  });

  it('matches the nickname and the picker label', () => {
    const partners = [partner({ id: 'p2', companyName: 'PIP DOO', nickname: 'Tortilje' })];

    expect(findPartnerByName(partners, 'tortilje')?.id).toBe('p2');
    expect(findPartnerByName(partners, 'PIP DOO (Tortilje)')?.id).toBe('p2');
  });

  it('matches an individual by first and last name', () => {
    const partners = [
      partner({
        id: 'p3',
        type: 'INDIVIDUAL',
        companyName: null,
        firstName: 'Petar',
        lastName: 'Petrović',
      }),
    ];

    expect(findPartnerByName(partners, 'petar petrović')?.id).toBe('p3');
  });

  it('does not match a prefix or an empty name', () => {
    const partners = [partner({})];

    expect(findPartnerByName(partners, 'RVAČKI SAVEZ')).toBeUndefined();
    expect(findPartnerByName(partners, '')).toBeUndefined();
    expect(findPartnerByName(partners, null)).toBeUndefined();
  });
});

describe('sortPartnersForPicker', () => {
  it('lists favorites first, each group alphabetically', () => {
    const partners = [
      partner({ id: 'b', companyName: 'Beta', isFavorite: false }),
      partner({ id: 'z', companyName: 'Zeta', isFavorite: true }),
      partner({ id: 'a', companyName: 'Alfa', isFavorite: false }),
      partner({ id: 'm', companyName: 'Mi', isFavorite: true }),
    ];

    expect(sortPartnersForPicker(partners).map((row) => row.id)).toEqual(['m', 'z', 'a', 'b']);
  });

  it('stars favorites in the picker label', () => {
    expect(partnerPickerLabel(partner({ companyName: 'Alfa', isFavorite: true }))).toBe('★ Alfa');
    expect(partnerPickerLabel(partner({ companyName: 'Alfa', isFavorite: false }))).toBe('Alfa');
  });
});
