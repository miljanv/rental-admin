'use client';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CompanyExpensesTable } from '@/features/company-expenses/components/company-expenses-table';
import { useCompanyExpenseSummary } from '@/features/company-expenses/hooks/use-company-expense-summary';
import { useVehicleCompanyExpenses } from '@/features/company-expenses/hooks/use-company-expenses';
import { formatMoney } from '@/lib/format';

interface VehicleExpensesTabProps {
  vehicleId: string;
}

export function VehicleExpensesTab({ vehicleId }: VehicleExpensesTabProps) {
  const query = useVehicleCompanyExpenses(vehicleId, { sortBy: 'issuedAt', sortOrder: 'desc' });
  const summaryQuery = useCompanyExpenseSummary({ vehicleId });
  const expenses = query.data ?? [];

  return (
    <div className="space-y-6">
      <Card className="shadow-none">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Utrošak održavanja i troškova</CardTitle>
            <CardDescription>Računi i keš troškovi koji su vezani za ovo vozilo.</CardDescription>
          </div>
          <Button variant="outline" asChild>
            <Link href="/expenses">
              <ExternalLink className="size-4" aria-hidden />
              Otvori Troškove
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {summaryQuery.isPending ? (
            <Skeleton className="h-9 w-40" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground text-sm">Ukupno</p>
                <p className="text-2xl font-semibold">{formatMoney(summaryQuery.data?.total ?? 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Plaćeno</p>
                <p className="text-2xl font-semibold">
                  {formatMoney(summaryQuery.data?.paidTotal ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Nije plaćeno</p>
                <p className="text-2xl font-semibold">
                  {formatMoney(summaryQuery.data?.unpaidTotal ?? 0)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Troškovi vozila</CardTitle>
          <CardDescription>Samo prikaz. Unos i izmena su na kartici Troškovi.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {query.isError ? (
            <ErrorState
              error={query.error}
              title="Troškovi nisu učitani"
              retryLabel="Pokušaj ponovo"
              retryingLabel="Učitavanje…"
              onRetry={() => void query.refetch()}
              isRetrying={query.isFetching}
            />
          ) : (
            <CompanyExpensesTable expenses={expenses} isLoading={query.isPending} readOnly />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
