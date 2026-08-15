import type {
  PaymentMethod,
  TransactionCategory,
  TransactionType,
  TransactionVehicleDto,
} from './transaction';

export interface FinanceReportQuery {
  from: string;
  to: string;
}

export interface FinanceMoneySplit {
  income: number;
  expense: number;
  profit: number;
  count: number;
}

export interface FinancePaymentMethodBreakdown extends FinanceMoneySplit {
  paymentMethod: PaymentMethod;
}

export interface FinanceCategoryBreakdown {
  category: TransactionCategory;
  expense: number;
  count: number;
}

export interface FinanceMonthlyPoint {
  year: number;
  month: number;
  income: number;
  expense: number;
  profit: number;
  byPaymentMethod: Array<{
    paymentMethod: PaymentMethod;
    income: number;
    expense: number;
  }>;
}

export interface FinanceVehicleProfit extends FinanceMoneySplit {
  vehicle: TransactionVehicleDto | null;
}

export interface FinancePartnerProfit extends FinanceMoneySplit {
  partner: string;
}

export interface FinanceRouteProfit extends FinanceMoneySplit {
  route: string;
}

export interface FinanceReportDto {
  from: string;
  to: string;
  totals: FinanceMoneySplit;
  byPaymentMethod: FinancePaymentMethodBreakdown[];
  byCategory: FinanceCategoryBreakdown[];
  monthly: FinanceMonthlyPoint[];
  byVehicle: FinanceVehicleProfit[];
  byPartner: FinancePartnerProfit[];
  byRoute: FinanceRouteProfit[];
}

export interface FinanceReportRow {
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  occurredAt: string;
  paymentMethod: PaymentMethod;
  vehicle: TransactionVehicleDto | null;
  partner: string | null;
  route: string | null;
}

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

/** Inclusive UTC range covering the last 12 calendar months through today. */
export const defaultFinanceReportRange = (now = new Date()): { from: string; to: string } => {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const from = new Date(Date.UTC(year, month - 11, 1));
  const to = new Date(Date.UTC(year, month, now.getUTCDate()));

  return { from: toIsoDate(from), to: toIsoDate(to) };
};

const emptySplit = (): FinanceMoneySplit => ({
  income: 0,
  expense: 0,
  profit: 0,
  count: 0,
});

const addToSplit = (split: FinanceMoneySplit, type: TransactionType, amount: number): void => {
  if (type === 'INCOME') {
    split.income += amount;
  } else {
    split.expense += amount;
  }

  split.count += 1;
  split.profit = split.income - split.expense;
};

const monthKey = (occurredAt: string): string => occurredAt.slice(0, 7);

const listMonthsInclusive = (from: string, to: string): Array<{ year: number; month: number; key: string }> => {
  const start = new Date(`${from.slice(0, 7)}-01T00:00:00.000Z`);
  const end = new Date(`${to.slice(0, 7)}-01T00:00:00.000Z`);
  const months: Array<{ year: number; month: number; key: string }> = [];
  const cursor = new Date(start);

  while (cursor.getTime() <= end.getTime()) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth() + 1;
    months.push({
      year,
      month,
      key: `${year}-${String(month).padStart(2, '0')}`,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
};

const compareProfitDesc = (left: FinanceMoneySplit, right: FinanceMoneySplit): number =>
  right.profit - left.profit || right.income - left.income || right.expense - left.expense;

/**
 * Builds the finance dashboard payload from already-filtered rows.
 * Settled advances must be excluded by the caller so a monthly invoice is
 * not double-counted against the advances it settled.
 */
export const buildFinanceReport = (
  rows: FinanceReportRow[],
  from: string,
  to: string,
): FinanceReportDto => {
  const totals = emptySplit();
  const byPayment = new Map<PaymentMethod, FinanceMoneySplit>([
    ['ACCOUNT', emptySplit()],
    ['CASH', emptySplit()],
  ]);
  const byCategory = new Map<TransactionCategory, { expense: number; count: number }>();
  const byMonth = new Map<string, FinanceMonthlyPoint>();
  const byVehicle = new Map<string, FinanceVehicleProfit>();
  const byPartner = new Map<string, FinancePartnerProfit>();
  const byRoute = new Map<string, FinanceRouteProfit>();

  for (const month of listMonthsInclusive(from, to)) {
    byMonth.set(month.key, {
      year: month.year,
      month: month.month,
      income: 0,
      expense: 0,
      profit: 0,
      byPaymentMethod: [
        { paymentMethod: 'ACCOUNT', income: 0, expense: 0 },
        { paymentMethod: 'CASH', income: 0, expense: 0 },
      ],
    });
  }

  for (const row of rows) {
    addToSplit(totals, row.type, row.amount);

    const paymentSplit = byPayment.get(row.paymentMethod) ?? emptySplit();
    addToSplit(paymentSplit, row.type, row.amount);
    byPayment.set(row.paymentMethod, paymentSplit);

    if (row.type === 'EXPENSE') {
      const category = byCategory.get(row.category) ?? { expense: 0, count: 0 };
      category.expense += row.amount;
      category.count += 1;
      byCategory.set(row.category, category);
    }

    const key = monthKey(row.occurredAt);
    const monthPoint = byMonth.get(key);

    if (monthPoint) {
      if (row.type === 'INCOME') {
        monthPoint.income += row.amount;
      } else {
        monthPoint.expense += row.amount;
      }

      monthPoint.profit = monthPoint.income - monthPoint.expense;
      const paymentSlice = monthPoint.byPaymentMethod.find(
        (slice) => slice.paymentMethod === row.paymentMethod,
      );

      if (paymentSlice) {
        if (row.type === 'INCOME') {
          paymentSlice.income += row.amount;
        } else {
          paymentSlice.expense += row.amount;
        }
      }
    }

    const vehicleKey = row.vehicle?.id ?? 'none';
    const vehicleRow = byVehicle.get(vehicleKey) ?? {
      vehicle: row.vehicle,
      ...emptySplit(),
    };
    addToSplit(vehicleRow, row.type, row.amount);
    byVehicle.set(vehicleKey, vehicleRow);

    const partnerName = row.partner?.trim() || 'Bez partnera';
    const partnerRow = byPartner.get(partnerName) ?? { partner: partnerName, ...emptySplit() };
    addToSplit(partnerRow, row.type, row.amount);
    byPartner.set(partnerName, partnerRow);

    const routeName = row.route?.trim() || 'Bez relacije';
    const routeRow = byRoute.get(routeName) ?? { route: routeName, ...emptySplit() };
    addToSplit(routeRow, row.type, row.amount);
    byRoute.set(routeName, routeRow);
  }

  return {
    from,
    to,
    totals,
    byPaymentMethod: (['ACCOUNT', 'CASH'] as const).map((paymentMethod) => ({
      paymentMethod,
      ...(byPayment.get(paymentMethod) ?? emptySplit()),
    })),
    byCategory: [...byCategory.entries()]
      .map(([category, value]) => ({ category, ...value }))
      .sort((left, right) => right.expense - left.expense),
    monthly: [...byMonth.values()],
    byVehicle: [...byVehicle.values()].sort(compareProfitDesc),
    byPartner: [...byPartner.values()].sort(compareProfitDesc),
    byRoute: [...byRoute.values()].sort(compareProfitDesc),
  };
};
