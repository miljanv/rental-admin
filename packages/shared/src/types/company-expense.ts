import type { PaymentMethod } from './transaction';

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
