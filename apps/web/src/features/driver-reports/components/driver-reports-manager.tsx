'use client';

import {
  DRIVER_REPORT_STATUS_LABELS,
  DRIVER_REPORT_STATUSES,
  type DriverReportAdminDto,
  type DriverReportStatus,
} from '@rental-admin/shared';
import { ClipboardCheck } from 'lucide-react';
import { useState } from 'react';

import { DateField } from '@/components/common/date-field';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { TableSkeleton } from '@/components/common/table-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DriverReportReviewSheet } from '@/features/driver-reports/components/driver-report-review-sheet';
import { useDriverReports } from '@/features/driver-reports/hooks/use-driver-reports';
import { driverReportKm, formatReportKm } from '@/features/driver-reports/lib/driver-report';
import { useDrivers } from '@/features/drivers/hooks/use-drivers';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';

const ALL = 'all';
const PAGE_SIZE = 20;

const statusVariant = (status: DriverReportStatus) => {
  switch (status) {
    case 'SUBMITTED':
      return 'default' as const;
    case 'RETURNED':
      return 'destructive' as const;
    default:
      return 'secondary' as const;
  }
};

/** Everything drivers sent from the portal; expenses wait here until the office accepts them. */
export function DriverReportsManager() {
  const [status, setStatus] = useState<DriverReportStatus | typeof ALL>('SUBMITTED');
  const [driverId, setDriverId] = useState<string>(ALL);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const driversQuery = useDrivers({ page: 1, limit: 100, sortBy: 'lastName', sortOrder: 'asc' });
  const query = useDriverReports({
    page,
    limit: PAGE_SIZE,
    status: status === ALL ? undefined : status,
    driverId: driverId === ALL ? undefined : driverId,
    from: from || undefined,
    to: to || undefined,
  });
  const reports = query.data?.reports ?? [];
  const pagination = query.data?.pagination;
  const selected: DriverReportAdminDto | null =
    reports.find((report) => report.id === selectedId) ?? null;
  const hasFilters = status !== ALL || driverId !== ALL || Boolean(from) || Boolean(to);

  const resetPage =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };

  return (
    <>
      <PageHeader
        title="Unosi vozača"
        description="Kilometraža i troškovi koje su vozači poslali sa telefona. Troškovi ulaze u finansije tek kada ih prihvatite."
      />

      <Card className="shadow-none">
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="report-status">Status</Label>
              <Select
                value={status}
                onValueChange={resetPage((value: string) =>
                  setStatus(value as DriverReportStatus | typeof ALL),
                )}
              >
                <SelectTrigger id="report-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Svi</SelectItem>
                  {DRIVER_REPORT_STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value === 'SUBMITTED' ? 'Na čekanju' : DRIVER_REPORT_STATUS_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-driver">Vozač</Label>
              <Select value={driverId} onValueChange={resetPage(setDriverId)}>
                <SelectTrigger id="report-driver" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Svi vozači</SelectItem>
                  {(driversQuery.data?.drivers ?? []).map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.firstName} {driver.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-from">Vožnje od</Label>
              <DateField id="report-from" value={from} onChange={resetPage(setFrom)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-to">Vožnje do</Label>
              <DateField id="report-to" value={to} onChange={resetPage(setTo)} min={from} />
            </div>
          </div>

          {query.isPending ? (
            <TableSkeleton columns={6} />
          ) : query.isError ? (
            <ErrorState
              error={query.error}
              title="Unosi nisu učitani"
              retryLabel="Pokušaj ponovo"
              retryingLabel="Učitavanje…"
              onRetry={() => void query.refetch()}
              isRetrying={query.isFetching}
            />
          ) : reports.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title={hasFilters ? 'Nema unosa za izabrane filtere' : 'Još nema unosa vozača'}
              description={
                hasFilters
                  ? 'Promenite filtere da biste videli ostale unose.'
                  : 'Kada vozač pošalje kilometražu ili troškove preko svog linka, pojaviće se ovde.'
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vožnja</TableHead>
                  <TableHead>Vozač</TableHead>
                  <TableHead>Relacija</TableHead>
                  <TableHead className="text-right">Km</TableHead>
                  <TableHead className="text-right">Troškovi na čekanju</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Poslato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow
                    key={report.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(report.id)}
                  >
                    <TableCell>{formatDate(report.trip.departureDate)}</TableCell>
                    <TableCell>
                      {report.driver.firstName} {report.driver.lastName}
                    </TableCell>
                    <TableCell>
                      {report.trip.origin} → {report.trip.destination}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatReportKm(driverReportKm(report))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {report.pendingCount > 0
                        ? `${report.pendingCount} · ${formatMoney(report.pendingTotal)}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(report.status)}>
                        {report.status === 'SUBMITTED'
                          ? 'Na čekanju'
                          : DRIVER_REPORT_STATUS_LABELS[report.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(report.submittedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {pagination && pagination.totalPages > 1 ? (
            <div className="flex items-center justify-end gap-2">
              <span className="text-muted-foreground text-xs tabular-nums">
                Strana {pagination.page} od {pagination.totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Prethodna
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Sledeća
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <DriverReportReviewSheet
        report={selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
          }
        }}
      />
    </>
  );
}
