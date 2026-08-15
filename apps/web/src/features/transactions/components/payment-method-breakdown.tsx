'use client';

import {
  PAYMENT_METHOD_LABELS,
  type FinancePaymentMethodBreakdown,
} from '@rental-admin/shared';

import { formatMoney } from '@/lib/format';

interface PaymentMethodBreakdownProps {
  byPaymentMethod: FinancePaymentMethodBreakdown[];
}

const METHOD_BG = {
  ACCOUNT: 'bg-[#2a78d6] dark:bg-[#3987e5]',
  CASH: 'bg-[#eb6834] dark:bg-[#d95926]',
} as const;

export function PaymentMethodBreakdown({ byPaymentMethod }: PaymentMethodBreakdownProps) {
  const totalExpense = byPaymentMethod.reduce((sum, item) => sum + item.expense, 0);
  const totalIncome = byPaymentMethod.reduce((sum, item) => sum + item.income, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {byPaymentMethod.map((item) => (
          <div key={item.paymentMethod} className="rounded-lg border px-3 py-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <span className={`size-2.5 rounded-full ${METHOD_BG[item.paymentMethod]}`} />
              {PAYMENT_METHOD_LABELS[item.paymentMethod]}
            </p>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Prihod</dt>
                <dd>{formatMoney(item.income)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Rashod</dt>
                <dd>{formatMoney(item.expense)}</dd>
              </div>
              <div className="flex justify-between gap-2 font-medium">
                <dt>Profit</dt>
                <dd>{formatMoney(item.profit)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      {totalExpense > 0 || totalIncome > 0 ? (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">Udeo rashoda</p>
          <div className="bg-muted flex h-2.5 overflow-hidden rounded-full">
            {byPaymentMethod.map((item) => {
              const width = totalExpense > 0 ? (item.expense / totalExpense) * 100 : 0;

              if (width <= 0) {
                return null;
              }

              return (
                <div
                  key={item.paymentMethod}
                  className={METHOD_BG[item.paymentMethod]}
                  style={{ width: `${width}%` }}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
