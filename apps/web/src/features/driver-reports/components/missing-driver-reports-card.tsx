'use client';

import Link from 'next/link';

import { ErrorState } from '@/components/common/error-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMissingDriverReports } from '@/features/driver-reports/hooks/use-missing-driver-reports';
import { formatDate } from '@/lib/format';

/** Finished trips of the last week whose driver has a link but sent nothing yet. */
export function MissingDriverReportsCard() {
  const query = useMissingDriverReports();

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Vožnje bez unosa vozača</CardTitle>
        <CardDescription>
          Završene vožnje iz poslednjih 7 dana za koje vozač ima link, a nije poslao podatke.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {query.isPending ? (
          <Skeleton className="h-12 w-full" />
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            title="Spisak nije učitan"
            retryLabel="Pokušaj ponovo"
            retryingLabel="Učitavanje…"
            onRetry={() => void query.refetch()}
            isRetrying={query.isFetching}
          />
        ) : query.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">Svi vozači su poslali podatke.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {query.data.map((entry) => (
              <li
                key={`${entry.tripId}-${entry.driver.id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground tabular-nums">
                  {formatDate(entry.departureDate)}
                </span>
                <span className="font-medium">
                  {entry.driver.firstName} {entry.driver.lastName}
                </span>
                <Link href={`/trips/${entry.tripId}`} className="text-primary hover:underline">
                  {entry.origin} → {entry.destination}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
