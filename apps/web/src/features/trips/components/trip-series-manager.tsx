'use client';

import {
  TRIP_SERIES_FREQUENCY_LABELS,
  WEEKDAY_LABELS,
  type TripDto,
} from '@rental-admin/shared';
import { useState } from 'react';

import { DateField } from '@/components/common/date-field';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteTripDialog } from '@/features/trips/components/delete-trip-dialog';
import { TripSeriesEditForm } from '@/features/trips/components/trip-series-edit-form';
import { TripsTable } from '@/features/trips/components/trips-table';
import { useTerminateTripSeries } from '@/features/trips/hooks/use-terminate-trip-series';
import { useTripSeries } from '@/features/trips/hooks/use-trip-series';
import { formatDate } from '@/lib/format';

interface TripSeriesManagerProps {
  seriesId: string;
}

function TerminateSeriesCard({ seriesId, isActive }: { seriesId: string; isActive: boolean }) {
  const mutation = useTerminateTripSeries(seriesId);
  const [fromDate, setFromDate] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    if (!fromDate) {
      return;
    }

    await mutation.mutateAsync({ fromDate });
    setIsConfirming(false);
  };

  if (!isActive) {
    return null;
  }

  return (
    <Card className="border-destructive/40 shadow-none">
      <CardHeader>
        <CardTitle>Prekid serije</CardTitle>
        <CardDescription>
          Briše sve vožnje iz serije čiji je datum polaska na ili posle izabranog datuma i
          deaktivira seriju. Prošle vožnje ostaju netaknute. Ova radnja se ne može opozvati.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="terminate-from-date">Od datuma</Label>
          <DateField
            id="terminate-from-date"
            value={fromDate}
            onChange={(value) => {
              setFromDate(value);
              setIsConfirming(false);
            }}
            disabled={mutation.isPending}
          />
        </div>

        {isConfirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-destructive text-sm">
              Sigurno prekinuti seriju od {formatDate(fromDate)}?
            </p>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => void handleConfirm()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Prekidanje…' : 'Da, prekini'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsConfirming(false)}
            >
              Otkaži
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="destructive"
            onClick={() => setIsConfirming(true)}
            disabled={!fromDate || mutation.isPending}
          >
            Prekini seriju
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function TripSeriesManager({ seriesId }: TripSeriesManagerProps) {
  const query = useTripSeries(seriesId);
  const [tripToDelete, setTripToDelete] = useState<TripDto | null>(null);

  if (query.isPending) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ErrorState
        error={query.error ?? new Error('Serija nije pronađena.')}
        title="Serija nije učitana"
        retryLabel="Pokušaj ponovo"
        retryingLabel="Učitavanje…"
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  const { series, trips } = query.data;
  const daysOfWeekLabel = series.daysOfWeek
    .slice()
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_LABELS[day])
    .join(', ');

  return (
    <>
      <PageHeader
        title={series.name || 'Serija vožnji'}
        description={`${formatDate(series.startDate)} – ${formatDate(series.endDate)}`}
        actions={
          <Badge variant={series.isActive ? 'default' : 'secondary'}>
            {series.isActive ? 'Aktivna' : 'Prekinuta'}
          </Badge>
        }
      />

      <div className="space-y-6">
        {trips[0] ? (
          <TripSeriesEditForm
            series={series}
            trip={trips[trips.length - 1] ?? trips[0]}
            dayCount={trips.length}
            vehiclesDiffer={
              new Set(trips.map((row) => row.vehicles.map((vehicle) => vehicle.id).join(',')))
                .size > 1
            }
          />
        ) : null}

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Pravilo ponavljanja</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <dt className="text-muted-foreground text-xs">Učestalost</dt>
                <dd className="text-sm font-medium">
                  {TRIP_SERIES_FREQUENCY_LABELS[series.frequency]}
                </dd>
              </div>
              {series.frequency === 'WEEKLY' ? (
                <div className="space-y-1">
                  <dt className="text-muted-foreground text-xs">Dani u nedelji</dt>
                  <dd className="text-sm font-medium">{daysOfWeekLabel || '—'}</dd>
                </div>
              ) : null}
              <div className="space-y-1">
                <dt className="text-muted-foreground text-xs">Broj vožnji</dt>
                <dd className="text-sm font-medium">{trips.length}</dd>
              </div>
              {series.terminatedAt ? (
                <div className="space-y-1">
                  <dt className="text-muted-foreground text-xs">Prekinuta od</dt>
                  <dd className="text-sm font-medium">{formatDate(series.terminatedAt)}</dd>
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>

        {series.pauses.length > 0 ? (
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Pauze</CardTitle>
              <CardDescription>
                Dani u periodu serije koji su preskočeni pri generisanju.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {series.pauses.map((pause) => (
                <div key={pause.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">
                    {formatDate(pause.startDate)} – {formatDate(pause.endDate)}
                  </span>
                  {pause.reason ? (
                    <span className="text-muted-foreground">{pause.reason}</span>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <TerminateSeriesCard seriesId={series.id} isActive={series.isActive} />

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Vožnje u seriji</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <TripsTable
              trips={trips}
              isLoading={false}
              hasFilters={false}
              groupByDay
              onRequestDelete={setTripToDelete}
            />
          </CardContent>
        </Card>
      </div>

      <DeleteTripDialog
        trip={tripToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setTripToDelete(null);
          }
        }}
      />
    </>
  );
}
