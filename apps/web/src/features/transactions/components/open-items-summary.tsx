'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSettlementTargets } from '@/features/transactions/hooks/use-settlement-targets';
import { formatMoney } from '@/lib/format';

export function OpenItemsSummary() {
  const receivablesQuery = useSettlementTargets({ type: 'INCOME', limit: 100 });
  const payablesQuery = useSettlementTargets({ type: 'EXPENSE', limit: 100 });
  const receivables = receivablesQuery.data?.targets ?? [];
  const payables = payablesQuery.data?.targets ?? [];
  const receivablesTotal = receivables.reduce((sum, target) => sum + target.remainingAmount, 0);
  const payablesTotal = payables.reduce((sum, target) => sum + target.remainingAmount, 0);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardDescription>Otvorena potraživanja</CardDescription>
          <CardTitle className="text-2xl">
            {receivablesQuery.isPending ? '…' : formatMoney(receivablesTotal)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {receivables.length} faktura vožnji čeka naplatu.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardDescription>Otvorena dugovanja</CardDescription>
          <CardTitle className="text-2xl">
            {payablesQuery.isPending ? '…' : formatMoney(payablesTotal)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {payables.length} računa dobavljača čeka plaćanje.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
