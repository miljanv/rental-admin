import type { AttachedFileDto } from './file';
import type { TripDriverDto, TripPartnerDto } from './trip';

export const TRIP_EXPENSE_CATEGORIES = [
  'FUEL',
  'TOLL',
  'PARKING',
  'FOOD',
  'LODGING',
  'PER_DIEM',
  'ROADSIDE_REPAIR',
  'VISA_PERMIT',
  'OTHER',
] as const;

export type TripExpenseCategory = (typeof TRIP_EXPENSE_CATEGORIES)[number];

export const TRIP_EXPENSE_CATEGORY_LABELS: Record<TripExpenseCategory, string> = {
  FUEL: 'Gorivo',
  TOLL: 'Putarina',
  PARKING: 'Parking',
  FOOD: 'Ishrana',
  LODGING: 'Smeštaj',
  PER_DIEM: 'Dnevnice',
  ROADSIDE_REPAIR: 'Popravka na putu',
  VISA_PERMIT: 'Viza / dozvola',
  OTHER: 'Ostalo',
};

export const TRIP_EXPENSE_PAYMENT_METHODS = ['CASH', 'COMPANY_CARD', 'INVOICE'] as const;

export type TripExpensePaymentMethod = (typeof TRIP_EXPENSE_PAYMENT_METHODS)[number];

export const TRIP_EXPENSE_PAYMENT_METHOD_LABELS: Record<TripExpensePaymentMethod, string> = {
  CASH: 'Gotovina',
  COMPANY_CARD: 'Službena kartica',
  INVOICE: 'Faktura',
};

export interface TripExpenseDto {
  id: string;
  tripId: string;
  category: TripExpenseCategory;
  amount: number;
  paymentMethod: TripExpensePaymentMethod;
  note: string | null;
  file: AttachedFileDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteTripExpenseResult {
  id: string;
  deleted: true;
}

export interface TripExpenseCategoryTotal {
  category: TripExpenseCategory;
  total: number;
}

export interface TripSettlementDto {
  tripId: string;
  paidAt: string | null;
  carrierId: string | null;
  carrier: TripPartnerDto | null;
  revenue: number;
  expenses: TripExpenseDto[];
  expensesTotal: number;
  byCategory: TripExpenseCategoryTotal[];
  drivers: TripDriverDto[];
  perDiemTotal: number;
  advanceTotal: number;
  netResult: number;
}

export interface TripSettlementComputeInput {
  price: number | null;
  expenses: Array<{ category: TripExpenseCategory; amount: number }>;
  drivers: Array<{ perDiemAmount: number | null; advanceAmount: number | null }>;
}

export interface TripSettlementTotals {
  revenue: number;
  expensesTotal: number;
  byCategory: TripExpenseCategoryTotal[];
  perDiemTotal: number;
  advanceTotal: number;
  netResult: number;
}

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

/** Revenue − expenses − per diems − advances. Pure; used by the API and tests. */
export const computeTripSettlement = (input: TripSettlementComputeInput): TripSettlementTotals => {
  const revenue = roundMoney(input.price ?? 0);
  const expensesTotal = roundMoney(
    input.expenses.reduce((sum, expense) => sum + expense.amount, 0),
  );
  const byCategory = TRIP_EXPENSE_CATEGORIES.flatMap((category) => {
    const total = roundMoney(
      input.expenses
        .filter((expense) => expense.category === category)
        .reduce((sum, expense) => sum + expense.amount, 0),
    );

    return total > 0 ? [{ category, total }] : [];
  });
  const perDiemTotal = roundMoney(
    input.drivers.reduce((sum, driver) => sum + (driver.perDiemAmount ?? 0), 0),
  );
  const advanceTotal = roundMoney(
    input.drivers.reduce((sum, driver) => sum + (driver.advanceAmount ?? 0), 0),
  );

  return {
    revenue,
    expensesTotal,
    byCategory,
    perDiemTotal,
    advanceTotal,
    netResult: roundMoney(revenue - expensesTotal - perDiemTotal - advanceTotal),
  };
};
