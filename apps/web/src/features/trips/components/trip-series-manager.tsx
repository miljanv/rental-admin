'use client';

import {
  MAX_TRIP_DRIVERS,
  MAX_TRIP_VEHICLES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  TRIP_SERIES_FREQUENCY_LABELS,
  TRIP_STATUS_LABELS,
  TRIP_STATUSES,
  WEEKDAY_LABELS,
  type BulkUpdateTripSeriesRequest,
  type PaymentMethod,
  type TripDto,
  type TripStatus,
} from '@rental-admin/shared';
import { useState } from 'react';

import { DateField } from '@/components/common/date-field';
import { ErrorState } from '@/components/common/error-state';
import { MultiSelectField } from '@/components/common/multi-select-field';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteTripDialog } from '@/features/trips/components/delete-trip-dialog';
import { TripsTable } from '@/features/trips/components/trips-table';
import { useBulkUpdateTripSeries } from '@/features/trips/hooks/use-bulk-update-trip-series';
import { useTerminateTripSeries } from '@/features/trips/hooks/use-terminate-trip-series';
import { useTripSeries } from '@/features/trips/hooks/use-trip-series';
import { useDrivers } from '@/features/drivers/hooks/use-drivers';
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles';
import { vehicleSelectLabel } from '@/features/vehicles/lib/vehicle';
import { formatDate } from '@/lib/format';

const NONE = 'none';

interface TripSeriesManagerProps {
  seriesId: string;
}

function BulkUpdateCard({ seriesId }: { seriesId: string }) {
  const mutation = useBulkUpdateTripSeries(seriesId);
  const vehiclesQuery = useVehicles({
    page: 1,
    limit: 100,
    sortBy: 'licensePlate',
    sortOrder: 'asc',
  });
  const driversQuery = useDrivers({ page: 1, limit: 100, sortBy: 'lastName', sortOrder: 'asc' });

  const [fromDate, setFromDate] = useState('');
  const [includeVehicles, setIncludeVehicles] = useState(false);
  const [vehicleIds, setVehicleIds] = useState<string[]>([]);
  const [includeVehicleCount, setIncludeVehicleCount] = useState(false);
  const [vehicleCount, setVehicleCount] = useState('1');
  const [includeDrivers, setIncludeDrivers] = useState(false);
  const [driverIds, setDriverIds] = useState<string[]>([]);
  const [includeStatus, setIncludeStatus] = useState(false);
  const [status, setStatus] = useState<TripStatus>('PLANNED');
  const [includePrice, setIncludePrice] = useState(false);
  const [price, setPrice] = useState('');
  const [includePaymentMethod, setIncludePaymentMethod] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');

  const vehicleOptions = (vehiclesQuery.data?.vehicles ?? []).map((vehicle) => ({
    value: vehicle.id,
    label: vehicleSelectLabel(vehicle),
  }));
  const driverOptions = (driversQuery.data?.drivers ?? []).map((driver) => ({
    value: driver.id,
    label: `${driver.firstName} ${driver.lastName}`,
  }));

  const hasSelection =
    includeVehicles ||
    includeVehicleCount ||
    includeDrivers ||
    includeStatus ||
    includePrice ||
    includePaymentMethod;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!fromDate || !hasSelection) {
      return;
    }

    const body: BulkUpdateTripSeriesRequest = { fromDate };

    if (includeVehicles) {
      body.vehicleIds = vehicleIds;
    }
    if (includeVehicleCount) {
      const parsedCount = Number(vehicleCount);
      body.vehicleCount = Number.isFinite(parsedCount) ? parsedCount : 1;
    }
    if (includeDrivers) {
      body.driverIds = driverIds;
    }
    if (includeStatus) {
      body.status = status;
    }
    if (includePrice) {
      body.price = price === '' ? null : Number(price);
    }
    if (includePaymentMethod) {
      body.paymentMethod = paymentMethod === '' ? null : paymentMethod;
    }

    await mutation.mutateAsync(body);
  };

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Izmena budućih instanci</CardTitle>
        <CardDescription>
          Menja samo vožnje iz ove serije čiji je datum polaska na ili posle izabranog datuma.
          Označite samo polja koja želite da promenite — neoznačena polja ostaju nepromenjena.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="bulk-from-date">Od datuma</Label>
            <DateField
              id="bulk-from-date"
              value={fromDate}
              onChange={setFromDate}
              disabled={mutation.isPending}
            />
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-vehicles"
                checked={includeVehicles}
                onCheckedChange={(checked) => setIncludeVehicles(checked === true)}
                disabled={mutation.isPending}
              />
              <Label htmlFor="include-vehicles" className="font-normal">
                Promeni vozila
              </Label>
            </div>
            {includeVehicles ? (
              <MultiSelectField
                options={vehicleOptions}
                selected={vehicleIds}
                onChange={setVehicleIds}
                disabled={mutation.isPending || vehiclesQuery.isPending}
                emptyLabel="Nema unetih vozila."
                maxSelected={MAX_TRIP_VEHICLES}
              />
            ) : null}
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-vehicle-count"
                checked={includeVehicleCount}
                onCheckedChange={(checked) => setIncludeVehicleCount(checked === true)}
                disabled={mutation.isPending}
              />
              <Label htmlFor="include-vehicle-count" className="font-normal">
                Promeni broj vozila
              </Label>
            </div>
            {includeVehicleCount ? (
              <div className="max-w-xs space-y-1.5">
                <Label htmlFor="bulk-vehicle-count">Broj vozila</Label>
                <Input
                  id="bulk-vehicle-count"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_TRIP_VEHICLES}
                  value={vehicleCount}
                  onChange={(event) => setVehicleCount(event.target.value)}
                  disabled={mutation.isPending}
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-drivers"
                checked={includeDrivers}
                onCheckedChange={(checked) => setIncludeDrivers(checked === true)}
                disabled={mutation.isPending}
              />
              <Label htmlFor="include-drivers" className="font-normal">
                Promeni vozače
              </Label>
            </div>
            {includeDrivers ? (
              <MultiSelectField
                options={driverOptions}
                selected={driverIds}
                onChange={setDriverIds}
                disabled={mutation.isPending || driversQuery.isPending}
                emptyLabel="Nema unetih vozača."
                maxSelected={MAX_TRIP_DRIVERS}
              />
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-status"
                  checked={includeStatus}
                  onCheckedChange={(checked) => setIncludeStatus(checked === true)}
                  disabled={mutation.isPending}
                />
                <Label htmlFor="include-status" className="font-normal">
                  Status
                </Label>
              </div>
              {includeStatus ? (
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as TripStatus)}
                  disabled={mutation.isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIP_STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {TRIP_STATUS_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-price"
                  checked={includePrice}
                  onCheckedChange={(checked) => setIncludePrice(checked === true)}
                  disabled={mutation.isPending}
                />
                <Label htmlFor="include-price" className="font-normal">
                  Cena
                </Label>
              </div>
              {includePrice ? (
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  disabled={mutation.isPending}
                />
              ) : null}
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-payment-method"
                  checked={includePaymentMethod}
                  onCheckedChange={(checked) => setIncludePaymentMethod(checked === true)}
                  disabled={mutation.isPending}
                />
                <Label htmlFor="include-payment-method" className="font-normal">
                  Način plaćanja
                </Label>
              </div>
              {includePaymentMethod ? (
                <Select
                  value={paymentMethod || NONE}
                  onValueChange={(value) =>
                    setPaymentMethod(value === NONE ? '' : (value as PaymentMethod))
                  }
                  disabled={mutation.isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Nije uneto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nije uneto</SelectItem>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {PAYMENT_METHOD_LABELS[method]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending || !fromDate || !hasSelection}>
              {mutation.isPending ? 'Izmena…' : 'Primeni izmenu'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
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

        {series.isActive ? <BulkUpdateCard seriesId={series.id} /> : null}
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
