import { describe, expect, it } from 'vitest';

import { tripBillingStatus } from './trip';

describe('tripBillingStatus', () => {
  it('is orange until an invoice exists', () => {
    expect(tripBillingStatus({ invoicedAt: null, paidAt: null })).toBe('UNINVOICED');
  });

  it('is red once invoiced and still unpaid', () => {
    expect(tripBillingStatus({ invoicedAt: '2026-09-26', paidAt: null })).toBe('INVOICED');
  });

  it('is green once the customer has paid', () => {
    expect(tripBillingStatus({ invoicedAt: '2026-09-26', paidAt: '2026-09-28' })).toBe('PAID');
    expect(tripBillingStatus({ invoicedAt: null, paidAt: '2026-09-28' })).toBe('PAID');
  });
});
