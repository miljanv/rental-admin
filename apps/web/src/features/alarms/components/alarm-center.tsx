'use client';

import {
  filterAlarms,
  type AlarmCategory,
  type AlarmKind,
  type AlarmUrgency,
} from '@rental-admin/shared';
import { RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlarmFilters,
  type AlarmFilterState,
} from '@/features/alarms/components/alarm-filters';
import { AlarmHero } from '@/features/alarms/components/alarm-hero';
import { AlarmsTable } from '@/features/alarms/components/alarms-table';
import { useAlarms } from '@/features/alarms/hooks/use-alarms';
import { useDrivers } from '@/features/drivers/hooks/use-drivers';
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles';
import { vehicleLabel } from '@/features/vehicles/lib/vehicle';
import { cn } from '@/lib/utils';

const ALL = 'all';

const EMPTY_FILTERS: AlarmFilterState = {
  kind: ALL,
  category: ALL,
  urgency: ALL,
  driverId: ALL,
  vehicleId: ALL,
};

export function AlarmCenter() {
  const alarmsQuery = useAlarms();
  const [filters, setFilters] = useState<AlarmFilterState>(EMPTY_FILTERS);

  const driversQuery = useDrivers({
    page: 1,
    limit: 100,
    sortBy: 'lastName',
    sortOrder: 'asc',
  });
  const vehiclesQuery = useVehicles({
    page: 1,
    limit: 100,
    sortBy: 'make',
    sortOrder: 'asc',
  });

  const items = useMemo(() => alarmsQuery.data?.items ?? [], [alarmsQuery.data?.items]);
  const counts = alarmsQuery.data?.counts;

  const filtered = useMemo(
    () =>
      filterAlarms(items, {
        kind: filters.kind === ALL ? undefined : (filters.kind as AlarmKind),
        category: filters.category === ALL ? undefined : (filters.category as AlarmCategory),
        urgency: filters.urgency === ALL ? undefined : (filters.urgency as AlarmUrgency),
        driverId: filters.driverId === ALL ? undefined : filters.driverId,
        vehicleId: filters.vehicleId === ALL ? undefined : filters.vehicleId,
      }),
    [filters, items],
  );

  const hasFilters = Object.values(filters).some((value) => value !== ALL);
  const drivers = (driversQuery.data?.drivers ?? []).map((driver) => ({
    id: driver.id,
    label: `${driver.firstName} ${driver.lastName}`,
  }));
  const vehicles = (vehiclesQuery.data?.vehicles ?? []).map((vehicle) => ({
    id: vehicle.id,
    label: vehicleLabel(vehicle),
  }));

  return (
    <div className="space-y-8">
      <AlarmHero today={alarmsQuery.data?.today} counts={counts} isLoading={alarmsQuery.isPending} />

      {alarmsQuery.isError ? (
        <ErrorState
          error={alarmsQuery.error}
          title="Alarmi nisu učitani"
          retryLabel="Pokušaj ponovo"
          retryingLabel="Učitavanje…"
          onRetry={() => void alarmsQuery.refetch()}
          isRetrying={alarmsQuery.isFetching}
        />
      ) : (
        <Card className="shadow-none">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Svi rokovi</CardTitle>
                <CardDescription>
                  {filtered.length === 0
                    ? 'Nema knjiženih rokova za prikaz.'
                    : `${filtered.length} ${filtered.length === 1 ? 'rok' : 'rokova'} u pregledu.`}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void alarmsQuery.refetch()}
                disabled={alarmsQuery.isFetching}
                aria-label="Osveži alarme"
              >
                <RefreshCw
                  className={cn('size-4', alarmsQuery.isFetching && 'animate-spin')}
                  aria-hidden
                />
                Osveži
              </Button>
            </div>
            <AlarmFilters
              value={filters}
              onChange={setFilters}
              drivers={drivers}
              vehicles={vehicles}
            />
          </CardHeader>
          <CardContent className="px-0">
            <AlarmsTable items={filtered} isLoading={alarmsQuery.isPending} hasFilters={hasFilters} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
