'use client';

import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  partnerSelectLabel,
  TRIP_STATUS_LABELS,
  TRIP_STATUSES,
  type PaymentMethod,
  type TripDto,
  type TripSortField,
  type TripStatus,
  type SortOrder,
} from '@rental-admin/shared';
import { RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { DateField } from '@/components/common/date-field';
import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DeleteTripDialog } from '@/features/trips/components/delete-trip-dialog';
import { TripsTable } from '@/features/trips/components/trips-table';
import { useTrips } from '@/features/trips/hooks/use-trips';
import { useDrivers } from '@/features/drivers/hooks/use-drivers';
import { usePartners } from '@/features/partners/hooks/use-partners';
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles';
import { localTodayIso } from '@/lib/format';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 350;
const ALL = 'all';

const SORT_OPTIONS: { value: `${TripSortField}:${SortOrder}`; label: string }[] = [
  { value: 'departureDate:asc', label: 'Po danu (danas prvo)' },
  { value: 'departureDate:desc', label: 'Datum polaska (noviji)' },
  { value: 'createdAt:desc', label: 'Najnovije uneto' },
  { value: 'status:asc', label: 'Status' },
];

export function TripsList() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<typeof ALL | TripStatus>(ALL);
  const [vehicleFilter, setVehicleFilter] = useState<typeof ALL | string>(ALL);
  const [driverFilter, setDriverFilter] = useState<typeof ALL | string>(ALL);
  const [partnerFilter, setPartnerFilter] = useState<typeof ALL | string>(ALL);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<typeof ALL | PaymentMethod>(ALL);
  const [country, setCountry] = useState('');
  const [from, setFrom] = useState(() => localTodayIso());
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<`${TripSortField}:${SortOrder}`>('departureDate:asc');
  const [tripToDelete, setTripToDelete] = useState<TripDto | null>(null);

  const [sortBy, sortOrder] = sort.split(':') as [TripSortField, SortOrder];
  const status = statusFilter === ALL ? undefined : statusFilter;
  const vehicleId = vehicleFilter === ALL ? undefined : vehicleFilter;
  const driverId = driverFilter === ALL ? undefined : driverFilter;
  const partnerId = partnerFilter === ALL ? undefined : partnerFilter;
  const paymentMethod = paymentMethodFilter === ALL ? undefined : paymentMethodFilter;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const vehiclesQuery = useVehicles({ page: 1, limit: 100, sortBy: 'make', sortOrder: 'asc' });
  const driversQuery = useDrivers({ page: 1, limit: 100, sortBy: 'lastName', sortOrder: 'asc' });
  const partnersQuery = usePartners({ page: 1, limit: 100, sortBy: 'type', sortOrder: 'asc' });
  const vehicles = vehiclesQuery.data?.vehicles ?? [];
  const drivers = driversQuery.data?.drivers ?? [];
  const partners = partnersQuery.data?.partners ?? [];

  const query = useTrips({
    page,
    limit: PAGE_SIZE,
    sortBy,
    sortOrder,
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(vehicleId ? { vehicleId } : {}),
    ...(driverId ? { driverId } : {}),
    ...(partnerId ? { partnerId } : {}),
    ...(paymentMethod ? { paymentMethod } : {}),
    ...(country ? { country } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  });

  const todayIso = localTodayIso();
  const trips = query.data?.trips ?? [];
  const pagination = query.data?.pagination;
  const totalPages = pagination?.totalPages ?? 0;
  const total = pagination?.total ?? 0;
  const isFromToday = from === todayIso;
  const hasFilters =
    search.length > 0 ||
    Boolean(status) ||
    Boolean(vehicleId) ||
    Boolean(driverId) ||
    Boolean(partnerId) ||
    Boolean(paymentMethod) ||
    Boolean(country) ||
    Boolean(to) ||
    (Boolean(from) && !isFromToday);
  const isDefaultTodayView = isFromToday && !hasFilters;

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Sve vožnje</CardTitle>
        <CardDescription>
          {total === 0
            ? isDefaultTodayView
              ? 'Nema vožnji od danas.'
              : 'Još nema unetih vožnji.'
            : `${total} ${total === 1 ? 'vožnja' : 'vožnji'}${sortBy === 'departureDate' ? ', grupisano po danu' : ''}.`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 px-0">
        <div className="flex flex-col gap-3 px-6 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <Label htmlFor="trip-search" className="text-xs">
              Pretraga
            </Label>
            <Input
              id="trip-search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="RN broj, relacija, naručilac"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as typeof ALL | TripStatus);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Svi statusi</SelectItem>
                {TRIP_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {TRIP_STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Vozilo</Label>
            <Select
              value={vehicleFilter}
              onValueChange={(value) => {
                setVehicleFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Sva vozila</SelectItem>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.licensePlate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Vozač</Label>
            <Select
              value={driverFilter}
              onValueChange={(value) => {
                setDriverFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Svi vozači</SelectItem>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.firstName} {driver.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Naručilac</Label>
            <Select
              value={partnerFilter}
              onValueChange={(value) => {
                setPartnerFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Svi partneri</SelectItem>
                {partners.map((partner) => (
                  <SelectItem key={partner.id} value={partner.id}>
                    {partnerSelectLabel(partner)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Način plaćanja</Label>
            <Select
              value={paymentMethodFilter}
              onValueChange={(value) => {
                setPaymentMethodFilter(value as typeof ALL | PaymentMethod);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Svi načini</SelectItem>
                {PAYMENT_METHODS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {PAYMENT_METHOD_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trip-country" className="text-xs">
              Država
            </Label>
            <Input
              id="trip-country"
              value={country}
              onChange={(event) => {
                setCountry(event.target.value);
                setPage(1);
              }}
              placeholder="npr. Srbija"
              className="w-full lg:w-32"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trip-from" className="text-xs">
              Period od
            </Label>
            <DateField
              id="trip-from"
              value={from}
              onChange={(value) => {
                setFrom(value);
                setPage(1);
              }}
              className="w-full lg:w-40"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trip-to" className="text-xs">
              Period do
            </Label>
            <DateField
              id="trip-to"
              value={to}
              onChange={(value) => {
                setTo(value);
                setPage(1);
              }}
              className="w-full lg:w-40"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Sortiranje</Label>
            <Select
              value={sort}
              onValueChange={(value) => {
                setSort(value as `${TripSortField}:${SortOrder}`);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setFrom(isFromToday ? '' : todayIso);
              setPage(1);
            }}
          >
            {isFromToday ? 'Prikaži i ranije' : 'Od danas'}
          </Button>

          <Button
            variant="outline"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
            aria-label="Osveži listu vožnji"
          >
            <RefreshCw className={cn('size-4', query.isFetching && 'animate-spin')} aria-hidden />
            Osveži
          </Button>
        </div>

        {query.isError ? (
          <ErrorState
            error={query.error}
            title="Lista vožnji nije učitana"
            retryLabel="Pokušaj ponovo"
            retryingLabel="Učitavanje…"
            onRetry={() => void query.refetch()}
            isRetrying={query.isFetching}
          />
        ) : (
          <TripsTable
            trips={trips}
            isLoading={query.isPending}
            hasFilters={hasFilters || isDefaultTodayView}
            groupByDay={sortBy === 'departureDate'}
            onRequestDelete={setTripToDelete}
            emptyTitle={isDefaultTodayView ? 'Nema vožnji od danas' : undefined}
            emptyDescription={
              isDefaultTodayView
                ? 'Tabela počinje od današnjeg dana. Prikažite ranije vožnje ili unesite novu.'
                : undefined
            }
            emptyAction={
              isDefaultTodayView ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFrom('');
                      setPage(1);
                    }}
                  >
                    Prikaži i ranije
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/trips/new">Kreiraj vožnju</Link>
                  </Button>
                </div>
              ) : (
                <Button size="sm" asChild>
                  <Link href="/trips/new">Kreiraj vožnju</Link>
                </Button>
              )
            }
          />
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-4 px-6 pt-2">
            <p className="text-muted-foreground text-sm">
              Strana {pagination?.page ?? page} od {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || query.isFetching}
              >
                Prethodna
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages || query.isFetching}
              >
                Sledeća
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>

      <DeleteTripDialog
        trip={tripToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setTripToDelete(null);
          }
        }}
      />
    </Card>
  );
}
