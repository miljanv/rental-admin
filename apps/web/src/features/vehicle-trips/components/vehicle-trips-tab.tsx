'use client';

import {
  TRIP_STATUS_LABELS,
  type VehicleTripRowDto,
  type VehicleTripsMonthDto,
} from '@rental-admin/shared';
import { Route } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { TableSkeleton } from '@/components/common/table-skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useVehicleTripsSummary } from '@/features/vehicle-trips/hooks/use-vehicle-trips-summary';
import { formatDate, formatKilometers, formatMoney, formatMonthYear } from '@/lib/format';
import { cn } from '@/lib/utils';

interface VehicleTripsTabProps {
  vehicleId: string;
}

const WHOLE_YEAR = 'all';
const YEARS_BACK = 4;

const pad = (value: number): string => String(value).padStart(2, '0');

const periodRange = (year: number, month: string): { from: string; to: string } => {
  if (month === WHOLE_YEAR) {
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }

  const monthNumber = Number(month);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  return {
    from: `${year}-${pad(monthNumber)}-01`,
    to: `${year}-${pad(monthNumber)}-${pad(lastDay)}`,
  };
};

const resultClass = (value: number): string =>
  value > 0
    ? 'text-emerald-700 dark:text-emerald-400'
    : value < 0
      ? 'text-destructive'
      : 'text-muted-foreground';

const monthLabel = (month: string): string =>
  formatMonthYear(Number(month.slice(0, 4)), Number(month.slice(5, 7)));

function StatTile({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <Card size="sm" className="shadow-none">
      <CardContent className="space-y-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className={cn('font-heading text-xl font-semibold tabular-nums', valueClassName)}>
          {value}
        </p>
        {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function MonthsTable({ months }: { months: VehicleTripsMonthDto[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mesec</TableHead>
          <TableHead className="text-right">Ture</TableHead>
          <TableHead className="text-right">Km</TableHead>
          <TableHead className="text-right">Prihod</TableHead>
          <TableHead className="text-right">Troškovi ture</TableHead>
          <TableHead className="text-right">Gorivo</TableHead>
          <TableHead className="text-right">Održavanje</TableHead>
          <TableHead className="text-right">Rezultat</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {months.map((month) => (
          <TableRow key={month.month}>
            <TableCell className="capitalize">{monthLabel(month.month)}</TableCell>
            <TableCell className="text-right tabular-nums">{month.tripCount}</TableCell>
            <TableCell className="text-right tabular-nums">{formatKilometers(month.km)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatMoney(month.revenue)}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatMoney(month.tripExpenses)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatMoney(month.fuelExpense)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatMoney(month.maintenanceExpense)}
            </TableCell>
            <TableCell
              className={cn('text-right font-medium tabular-nums', resultClass(month.result))}
            >
              {formatMoney(month.result)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TripsTable({ trips }: { trips: VehicleTripRowDto[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Datum</TableHead>
          <TableHead>Tura</TableHead>
          <TableHead>Vozači</TableHead>
          <TableHead className="text-right">Km</TableHead>
          <TableHead className="text-right">Prihod</TableHead>
          <TableHead className="text-right">Troškovi</TableHead>
          <TableHead className="text-right">Rezultat</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trips.map((trip) => (
          <TableRow key={trip.tripId}>
            <TableCell className="whitespace-nowrap">
              {formatDate(trip.departureDate)}
              {trip.returnDate && trip.returnDate !== trip.departureDate ? (
                <span className="text-muted-foreground block text-xs">
                  do {formatDate(trip.returnDate)}
                </span>
              ) : null}
            </TableCell>
            <TableCell className="min-w-48">
              <Link
                href={`/trips/${trip.tripId}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {trip.route}
              </Link>
              <span className="text-muted-foreground block text-xs">
                {trip.client}
                {trip.referenceNumber ? ` · RN ${trip.referenceNumber}` : ''}
                {trip.status !== 'COMPLETED' ? ` · ${TRIP_STATUS_LABELS[trip.status]}` : ''}
              </span>
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {trip.drivers.length > 0 ? trip.drivers.join(', ') : '—'}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {trip.km === null ? '—' : formatKilometers(trip.km)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatMoney(trip.revenue)}
              <span className="mt-0.5 flex justify-end gap-1">
                {trip.revenueSource === 'PRICE' ? (
                  <Badge variant="outline" className="text-[10px]">
                    procena
                  </Badge>
                ) : null}
                {trip.vehicleCount > 1 ? (
                  <Badge variant="secondary" className="text-[10px]">
                    {Math.round(trip.share * 100)}% od {trip.vehicleCount} vozila
                  </Badge>
                ) : null}
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatMoney(trip.tripExpenses)}
            </TableCell>
            <TableCell
              className={cn('text-right font-medium tabular-nums', resultClass(trip.result))}
            >
              {formatMoney(trip.result)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function VehicleTripsTab({ vehicleId }: VehicleTripsTabProps) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<string>(WHOLE_YEAR);
  const params = useMemo(() => periodRange(year, month), [year, month]);
  const query = useVehicleTripsSummary(vehicleId, params);
  const summary = query.data;
  const totals = summary?.totals;

  const years = Array.from({ length: YEARS_BACK + 1 }, (_, index) => currentYear - index);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="vehicle-trips-year" className="text-xs">
            Godina
          </Label>
          <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
            <SelectTrigger id="vehicle-trips-year" className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}.
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vehicle-trips-month" className="text-xs">
            Mesec
          </Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger id="vehicle-trips-month" className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={WHOLE_YEAR}>Cela godina</SelectItem>
              {Array.from({ length: 12 }, (_, index) => (
                <SelectItem key={index + 1} value={String(index + 1)} className="capitalize">
                  {formatMonthYear(year, index + 1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {query.isError ? (
        <ErrorState
          error={query.error}
          title="Vožnje nisu učitane"
          retryLabel="Pokušaj ponovo"
          retryingLabel="Učitavanje…"
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {totals ? (
              <>
                <StatTile
                  label="Pređeno"
                  value={formatKilometers(totals.km)}
                  hint={`Broj tura: ${totals.tripCount}`}
                />
                <StatTile
                  label="Prihod"
                  value={formatMoney(totals.revenue)}
                  hint={
                    totals.estimatedRevenue > 0
                      ? `od toga procena ${formatMoney(totals.estimatedRevenue)}`
                      : totals.revenuePerKm !== null
                        ? `${formatMoney(totals.revenuePerKm)} po km`
                        : undefined
                  }
                />
                <StatTile
                  label="Troškovi"
                  value={formatMoney(totals.totalExpense)}
                  hint={`tura ${formatMoney(totals.tripExpenses)} · gorivo ${formatMoney(totals.fuelExpense)} · održavanje ${formatMoney(totals.maintenanceExpense)}`}
                />
                <StatTile
                  label={totals.result >= 0 ? 'Zarada' : 'Gubitak'}
                  value={formatMoney(totals.result)}
                  valueClassName={resultClass(totals.result)}
                  hint={
                    totals.costPerKm !== null
                      ? `trošak ${formatMoney(totals.costPerKm)} po km`
                      : undefined
                  }
                />
              </>
            ) : (
              Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-24 rounded-xl" />
              ))
            )}
          </div>

          {month === WHOLE_YEAR ? (
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Po mesecima</CardTitle>
                <CardDescription>
                  Prihod i troškovi tura plus gorivo i održavanje koji se vode posebno na vozilu.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                {summary ? (
                  <MonthsTable months={summary.months} />
                ) : (
                  <TableSkeleton columns={8} rows={6} />
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Ture</CardTitle>
              <CardDescription>
                Kad na turi radi više vozila, prihod i troškovi se dele srazmerno km. Gorivo nije u
                troškovima ture jer se vodi kroz sipanja vozila.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {!summary ? (
                <TableSkeleton columns={7} />
              ) : summary.trips.length === 0 ? (
                <EmptyState
                  icon={Route}
                  title="Nema tura u ovom periodu"
                  description="Ture se ovde pojavljuju čim se vozilo doda na turu."
                />
              ) : (
                <TripsTable trips={summary.trips} />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
