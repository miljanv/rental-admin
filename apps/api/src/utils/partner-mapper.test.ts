import { describe, expect, it } from 'vitest';

import { toPartnerDto, type PartnerRecord } from './partner-mapper';

const record: PartnerRecord = {
  id: 'partner_1',
  type: 'TRAVEL_AGENCY',
  companyName: 'Sunny Travel doo',
  firstName: null,
  lastName: null,
  address: 'Bulevar oslobođenja 1',
  city: 'Novi Sad',
  nickname: null,
  pib: '123456789',
  registrationNumber: '20123456',
  personalId: null,
  bankAccounts: [{ id: 'acct_1', accountNumber: '190-0000000146210-88' }],
  createdAt: new Date('2026-08-14T10:00:00.000Z'),
  updatedAt: new Date('2026-08-14T10:00:00.000Z'),
};

describe('toPartnerDto', () => {
  it('maps a legal-entity partner', () => {
    expect(toPartnerDto(record)).toMatchObject({
      id: 'partner_1',
      type: 'TRAVEL_AGENCY',
      companyName: 'Sunny Travel doo',
      firstName: null,
      pib: '123456789',
      bankAccounts: [{ accountNumber: '190-0000000146210-88' }],
    });
  });
});
