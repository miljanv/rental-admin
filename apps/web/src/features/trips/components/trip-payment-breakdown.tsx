'use client';

import { PAYMENT_METHOD_LABELS, type TripPaymentMethodTotal } from '@rental-admin/shared';

import { formatMoney } from '@/lib/format';

interface TripPaymentBreakdownProps {
  byPaymentMethod: TripPaymentMethodTotal[];
}

const METHOD_BG = {
  ACCOUNT: 'bg-[#2a78d6] dark:bg-[#3987e5]',
  CASH: 'bg-[#eb6834] dark:bg-[#d95926]',
} as const;

export function TripPaymentBreakdown({ byPaymentMethod }: TripPaymentBreakdownProps) {
  if (byPaymentMethod.length === 0) {
    return <p className="text-muted-foreground text-sm">Nema plaćenih vožnji u izabranom periodu.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {byPaymentMethod.map((item) => (
        <div key={item.paymentMethod} className="rounded-lg border px-3 py-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <span className={`size-2.5 rounded-full ${METHOD_BG[item.paymentMethod]}`} />
            {PAYMENT_METHOD_LABELS[item.paymentMethod]}
          </p>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Broj vožnji</dt>
              <dd>{item.count}</dd>
            </div>
            <div className="flex justify-between gap-2 font-medium">
              <dt>Prihod</dt>
              <dd>{formatMoney(item.revenue)}</dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  );
}
