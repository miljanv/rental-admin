'use client';

import { ErrorState } from '@/components/common/error-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useOpenItemsTotals } from '@/features/transactions/hooks/use-open-items-totals';
import { formatMoney } from '@/lib/format';

export function OpenItemsSummary() {
  const query = useOpenItemsTotals();
  const totals = query.data;

  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title="Otvorene stavke nisu učitane"
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardDescription>Otvorena potraživanja · ukupno do danas</CardDescription>
          <CardTitle className="text-2xl">
            {query.isPending ? '…' : formatMoney(totals?.receivables.total ?? 0)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {totals?.receivables.count ?? 0} faktura vožnji čeka naplatu.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardDescription>Otvorena dugovanja · ukupno do danas</CardDescription>
          <CardTitle className="text-2xl">
            {query.isPending ? '…' : formatMoney(totals?.payables.total ?? 0)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {totals?.payables.count ?? 0} računa dobavljača čeka plaćanje.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
