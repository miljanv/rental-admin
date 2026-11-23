import { z } from 'zod';

/** Serbian domestic (with dashes) or a foreign IBAN. Spaces are dropped before the check. */
const DOMESTIC_ACCOUNT = /^\d{3}-\d{1,13}-\d{2}$/;
const IBAN = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

export const isBankAccountNumber = (value: string): boolean =>
  DOMESTIC_ACCOUNT.test(value) || IBAN.test(value);

export const normalizeBankAccountInput = (value: string): string =>
  value.replace(/\s+/g, '').trim().toUpperCase();

export const BANK_ACCOUNT_FORMAT_MESSAGE = 'Unesite domaći račun (000-0000000000000-00) ili IBAN.';

export const bankAccountNumberSchema = z
  .string()
  .trim()
  .max(40, 'Broj računa sme imati najviše 40 karaktera.')
  .transform(normalizeBankAccountInput)
  .refine(isBankAccountNumber, { message: BANK_ACCOUNT_FORMAT_MESSAGE });

export const bankAccountWriteSchema = z.object({
  accountNumber: bankAccountNumberSchema,
});
