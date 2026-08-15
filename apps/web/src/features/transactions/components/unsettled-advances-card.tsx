'use client';

import type { UnsettledAdvanceGroupDto } from '@rental-admin/shared';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUnsettledAdvances } from '@/features/transactions/hooks/use-unsettled-advances';
import { formatMoney } from '@/lib/format';

interface UnsettledAdvancesCardProps {
  onSettle: (group: UnsettledAdvanceGroupDto) => void;
}

export function UnsettledAdvancesCard({ onSettle }: UnsettledAdvancesCardProps) {
  const query = useUnsettledAdvances();
  const groups = query.data?.groups ?? [];

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Nerazduženi avansi</CardTitle>
        <CardDescription>
          Uplate dobavljačima goriva tokom meseca. Kad stigne konačna faktura, razdužite zbir
          avansa.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {query.isError ? (
          <ErrorState
            error={query.error}
            title="Avansi nisu učitani"
            retryLabel="Pokušaj ponovo"
            retryingLabel="Učitavanje…"
            onRetry={() => void query.refetch()}
            isRetrying={query.isFetching}
          />
        ) : query.isPending ? (
          <p className="text-muted-foreground text-sm">Učitavanje avansa…</p>
        ) : groups.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nema nerazduženih avansa.</p>
        ) : (
          <ul className="space-y-3">
            {groups.map((group) => (
              <li
                key={group.supplier}
                className="flex flex-col gap-2 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{group.supplier}</p>
                  <p className="text-muted-foreground text-sm">
                    {group.count} {group.count === 1 ? 'avans' : 'avansa'} · {formatMoney(group.total)}
                  </p>
                </div>
                <Button size="sm" onClick={() => onSettle(group)}>
                  Razduži
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
