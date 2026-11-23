import { describe, expect, it } from 'vitest';

import {
  bankAccountNumberSchema,
  isBankAccountNumber,
  normalizeBankAccountInput,
} from './bank-account';

describe('bankAccountNumberSchema', () => {
  it('accepts a domestic account and keeps the dashes', () => {
    expect(bankAccountNumberSchema.parse('160-0000001902222-87')).toBe('160-0000001902222-87');
  });

  it('accepts an IBAN with or without spaces and uppercases it', () => {
    expect(bankAccountNumberSchema.parse('SI56 0400 1004 8371 076')).toBe('SI56040010048371076');
    expect(bankAccountNumberSchema.parse('si56040010048371076')).toBe('SI56040010048371076');
  });

  it('rejects a partial or made-up number', () => {
    expect(bankAccountNumberSchema.safeParse('160-123').success).toBe(false);
    expect(bankAccountNumberSchema.safeParse('NOT-AN-IBAN').success).toBe(false);
    expect(bankAccountNumberSchema.safeParse('SI56').success).toBe(false);
  });
});

describe('normalizeBankAccountInput', () => {
  it('drops spaces and uppercases letters', () => {
    expect(normalizeBankAccountInput(' si56 0400 ')).toBe('SI560400');
  });
});

describe('isBankAccountNumber', () => {
  it('recognizes both shapes after normalization', () => {
    expect(isBankAccountNumber('160-1-67')).toBe(true);
    expect(isBankAccountNumber('DE89370400440532013000')).toBe(true);
  });
});
