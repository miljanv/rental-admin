import type { PaymentMethod, TransactionCategory } from './transaction';

export interface CompanyExpenseVehicleDto {
  id: string;
  make: string;
  model: string;
  licensePlate: string;
}

export interface CompanyExpenseDto {
  id: string;
  issuedAt: string;
  invoiceNumber: string | null;
  supplier: string;
  description: string;
  amount: number;
  amountWithoutVat: number;
  vatAmount: number;
  amountWithVat: number;
  paymentMethod: PaymentMethod;
  vehicleId: string | null;
  vehicle: CompanyExpenseVehicleDto | null;
  odometerKm: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteCompanyExpenseResult {
  id: string;
  deleted: true;
}

export interface CompanyExpenseSummaryDto {
  total: number;
  totalWithoutVat: number;
  totalVat: number;
  count: number;
}

export interface CompanyExpenseSuppliersDto {
  suppliers: string[];
}

export const COMPANY_EXPENSE_VAT_RATES = [0, 10, 20] as const;

export type CompanyExpenseVatRate = (typeof COMPANY_EXPENSE_VAT_RATES)[number];

export const COMPANY_EXPENSE_VAT_RATE_LABELS: Record<CompanyExpenseVatRate, string> = {
  0: '0%',
  10: '10%',
  20: '20%',
};

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

/**
 * `amount` is the invoice total (what was paid). Net and VAT follow the rate.
 */
export const splitCompanyExpenseAmount = (
  amount: number,
  vatRate: CompanyExpenseVatRate,
): { amountWithoutVat: number; vatAmount: number; amountWithVat: number } => {
  const amountWithVat = roundMoney(amount);

  if (vatRate === 0) {
    return { amountWithoutVat: amountWithVat, vatAmount: 0, amountWithVat };
  }

  const amountWithoutVat = roundMoney(amountWithVat / (1 + vatRate / 100));
  const vatAmount = roundMoney(amountWithVat - amountWithoutVat);

  return { amountWithoutVat, vatAmount, amountWithVat };
};

const includesAny = (text: string, needles: readonly string[]): boolean =>
  needles.some((needle) => text.includes(needle));

/**
 * Finance category for an invoice already recorded under Troškovi.
 * The description is what the operator typed; there is no separate category field.
 */
export const companyExpenseFinanceCategory = (description: string): TransactionCategory => {
  const text = description.toLocaleLowerCase('sr-Latn');

  if (includesAny(text, ['pp aparat', 'protivpožar', 'protivpozar'])) {
    return 'FIRE_EXTINGUISHER';
  }

  if (includesAny(text, ['tahograf'])) {
    return 'TACHOGRAPH';
  }

  if (includesAny(text, ['tehnički pregled', 'tehnicki pregled'])) {
    return 'TECHNICAL_INSPECTION';
  }

  if (includesAny(text, ['gorivo', 'dizel', 'benzin', 'točenje', 'tocenje'])) {
    return 'FUEL';
  }

  if (
    includesAny(text, [
      'guma',
      'gum',
      'koč',
      'koc',
      'kloc',
      'pločic',
      'plocic',
      'filter',
      'pumpa',
      'crevo',
      'prsluk',
      'brezon',
      'matic',
      'osovin',
      'senzor',
      'čeljust',
      'celjust',
      'montaž',
      'montaz',
    ])
  ) {
    return 'PARTS';
  }

  return 'OTHER';
};

export const companyExpenseFinanceNote = (
  expense: Pick<CompanyExpenseDto, 'invoiceNumber' | 'description'>,
): string => {
  const description = expense.description.trim();

  return expense.invoiceNumber ? `${expense.invoiceNumber} — ${description}` : description;
};

export const inferCompanyExpenseVatRate = (
  expense: Pick<CompanyExpenseDto, 'amountWithoutVat' | 'amountWithVat' | 'vatAmount'>,
): CompanyExpenseVatRate => {
  if (expense.amountWithoutVat <= 0 || expense.vatAmount <= 0) {
    return 0;
  }

  const implied = (expense.amountWithVat / expense.amountWithoutVat - 1) * 100;

  return COMPANY_EXPENSE_VAT_RATES.reduce((best, rate) =>
    Math.abs(rate - implied) < Math.abs(best - implied) ? rate : best,
  );
};
