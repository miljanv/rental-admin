'use client';

import { DRIVER_REPORT_STATUS_LABELS, type TripDto } from '@rental-admin/shared';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DriverReportReviewSheet } from '@/features/driver-reports/components/driver-report-review-sheet';
import { useDriverReports } from '@/features/driver-reports/hooks/use-driver-reports';
import { driverReportKm, formatReportKm } from '@/features/driver-reports/lib/driver-report';
import { formatDateTime, formatMoney } from '@/lib/format';

/** What the trip's drivers sent from the driver portal, reviewable in place. */
export function TripDriverReportsCard({ trip }: { trip: TripDto }) {
  const query = useDriverReports({ page: 1, limit: 10, tripId: trip.id });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const reports = query.data?.reports ?? [];
  const selected = reports.find((report) => report.id === selectedId) ?? null;

  if (trip.drivers.length === 0 && trip.driverReports.count === 0) {
    return null;
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Unos vozača</CardTitle>
        <CardDescription>
          Kilometraža i troškovi koje su vozači poslali sa telefona. Troškovi ulaze u obračun tek
          kada ih prihvatite.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {query.isPending ? (
          <Skeleton className="h-14 w-full" />
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            title="Unosi vozača nisu učitani"
            retryLabel="Pokušaj ponovo"
            retryingLabel="Učitavanje…"
            onRetry={() => void query.refetch()}
            isRetrying={query.isFetching}
          />
        ) : reports.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Vozači još nisu poslali podatke za ovu vožnju.
          </p>
        ) : (
          reports.map((report) => (
            <button
              key={report.id}
              type="button"
              onClick={() => setSelectedId(report.id)}
              className="hover:bg-muted flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border p-3 text-left text-sm transition-colors"
            >
              <span className="font-medium">
                {report.driver.firstName} {report.driver.lastName}
              </span>
              <Badge variant={report.status === 'SUBMITTED' ? 'default' : 'secondary'}>
                {report.status === 'SUBMITTED'
                  ? 'Na čekanju'
                  : DRIVER_REPORT_STATUS_LABELS[report.status]}
              </Badge>
              <span className="text-muted-foreground">
                {formatReportKm(driverReportKm(report))}
                {report.pendingCount > 0
                  ? ` · ${report.pendingCount} troška čeka (${formatMoney(report.pendingTotal)})`
                  : ''}
              </span>
              <span className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
                {formatDateTime(report.submittedAt)}
                <ChevronRight className="size-4" aria-hidden />
              </span>
            </button>
          ))
        )}
      </CardContent>

      <DriverReportReviewSheet
        report={selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
          }
        }}
      />
    </Card>
  );
}
