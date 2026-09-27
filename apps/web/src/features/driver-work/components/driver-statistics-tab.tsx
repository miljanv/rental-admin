'use client';

import { utcMonthRangeIso } from '@rental-admin/shared';
import { CalendarDays, Gauge, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DateField } from '@/components/common/date-field';
import { ErrorState } from '@/components/common/error-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDriverStatistics } from '@/features/driver-work/hooks/use-driver-statistics';
import { formatDate, formatKilometers, formatMoney, formatMonthYear } from '@/lib/format';

interface DriverStatisticsTabProps {
  driverId: string;
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  isLoading,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Gauge;
  isLoading: boolean;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="truncate text-3xl font-semibold tracking-tight">{value}</p>
          )}
          <p className="text-muted-foreground text-xs">{hint}</p>
        </div>
        <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Icon className="size-4.5" aria-hidden />
        </span>
      </CardContent>
    </Card>
  );
}

export function DriverStatisticsTab({ driverId }: DriverStatisticsTabProps) {
  const defaultRange = useMemo(() => utcMonthRangeIso(), []);
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const query = useDriverStatistics(driverId, { from, to });
  const stats = query.data;
  const periodHint = `${formatDate(from)} – ${formatDate(to)}`;
  const year = Number(from.slice(0, 4));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="stats-from" className="text-xs">
            Od
          </Label>
          <DateField id="stats-from" value={from} onChange={setFrom} className="w-full sm:w-40" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stats-to" className="text-xs">
            Do
          </Label>
          <DateField id="stats-to" value={to} onChange={setTo} className="w-full sm:w-40" />
        </div>
      </div>

      {query.isError ? (
        <ErrorState
          error={query.error}
          title="Statistika nije učitana"
          retryLabel="Pokušaj ponovo"
          retryingLabel="Učitavanje…"
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard
              label="Kilometri u periodu"
              value={formatKilometers(stats?.distanceKm ?? 0)}
              hint={`${periodHint} · ${stats?.tripCount ?? 0} vožnji`}
              icon={Gauge}
              isLoading={query.isPending}
            />
            <SummaryCard
              label="Radni dani"
              value={String(stats?.workingDays ?? 0)}
              hint="Jedinstveni dani u periodu (bez duplog brojanja)"
              icon={CalendarDays}
              isLoading={query.isPending}
            />
            <SummaryCard
              label="Prosečna mesečna zarada"
              value={
                stats?.averageMonthlyEarnings != null
                  ? formatMoney(stats.averageMonthlyEarnings)
                  : '—'
              }
              hint={`Prosek meseci sa isplatom u ${year}.`}
              icon={TrendingUp}
              isLoading={query.isPending}
            />
          </div>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Zarada po mesecima ({year}.)</CardTitle>
              <CardDescription>
                Unete dnevnice sa obračuna vožnji. Prosek iznad ne uključuje mesece bez isplate.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {query.isPending ? (
                <div className="px-6">
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mesec</TableHead>
                      <TableHead className="text-right">Vožnje</TableHead>
                      <TableHead className="text-right">Radni dani</TableHead>
                      <TableHead className="text-right">Km</TableHead>
                      <TableHead className="text-right">Dnevnice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(stats?.monthlyEarnings ?? []).map((month) => (
                      <TableRow key={`${month.year}-${month.month}`}>
                        <TableCell>{formatMonthYear(month.year, month.month)}</TableCell>
                        <TableCell className="text-right tabular-nums">{month.tripCount}</TableCell>
                        <TableCell className="text-right tabular-nums">{month.workingDays}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatKilometers(month.distanceKm)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(month.perDiemAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
