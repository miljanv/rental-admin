'use client';

import {
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUSES,
  VEHICLE_TYPE_LABELS,
  VEHICLE_TYPES,
  type VehicleDto,
  type VehicleSortField,
  type VehicleStatus,
  type VehicleType,
  type SortOrder,
} from '@rental-admin/shared';
import { Plus, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
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
import { DeleteVehicleDialog } from '@/features/vehicles/components/delete-vehicle-dialog';
import { VehiclesTable } from '@/features/vehicles/components/vehicles-table';
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;
const ALL_STATUSES = 'all';
const ALL_TYPES = 'all';

const SORT_OPTIONS: { value: `${VehicleSortField}:${SortOrder}`; label: string }[] = [
  { value: 'make:asc', label: 'Marka A–Š' },
  { value: 'make:desc', label: 'Marka Š–A' },
  { value: 'createdAt:desc', label: 'Najnoviji' },
  { value: 'createdAt:asc', label: 'Najstariji' },
  { value: 'currentMileage:desc', label: 'Najveća kilometraža' },
  { value: 'status:asc', label: 'Status' },
];

export function VehiclesList() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<typeof ALL_STATUSES | VehicleStatus>(
    ALL_STATUSES,
  );
  const [typeFilter, setTypeFilter] = useState<typeof ALL_TYPES | VehicleType>(ALL_TYPES);
  const [sort, setSort] = useState<`${VehicleSortField}:${SortOrder}`>('make:asc');
  const [vehicleToDelete, setVehicleToDelete] = useState<VehicleDto | null>(null);

  const [sortBy, sortOrder] = sort.split(':') as [VehicleSortField, SortOrder];
  const status = statusFilter === ALL_STATUSES ? undefined : statusFilter;
  const type = typeFilter === ALL_TYPES ? undefined : typeFilter;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const query = useVehicles({
    page,
    limit: PAGE_SIZE,
    sortBy,
    sortOrder,
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
  });

  const vehicles = query.data?.vehicles ?? [];
  const pagination = query.data?.pagination;
  const totalPages = pagination?.totalPages ?? 0;
  const total = pagination?.total ?? 0;

  return (
    <>
      <PageHeader
        title="Vozila"
        description="Vozni park, status vozila i osnovni podaci."
        actions={
          <Button asChild>
            <Link href="/vehicles/new">
              <Plus className="size-4" aria-hidden />
              Novo vozilo
            </Link>
          </Button>
        }
      />

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Sva vozila</CardTitle>
          <CardDescription>
            {total === 0
              ? 'Još nema unetih vozila.'
              : `${total} ${total === 1 ? 'vozilo' : 'vozila'} u evidenciji.`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-0">
          <div className="flex flex-col gap-3 px-6 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="vehicle-search" className="text-xs">
                Pretraga
              </Label>
              <div className="relative">
                <Search
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                  aria-hidden
                />
                <Input
                  id="vehicle-search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Marka, model, tablice ili VIN"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vehicle-type" className="text-xs">
                Tip
              </Label>
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value as typeof ALL_TYPES | VehicleType);
                  setPage(1);
                }}
              >
                <SelectTrigger id="vehicle-type" className="w-full lg:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_TYPES}>Svi tipovi</SelectItem>
                  {VEHICLE_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {VEHICLE_TYPE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vehicle-status" className="text-xs">
                Status
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as typeof ALL_STATUSES | VehicleStatus);
                  setPage(1);
                }}
              >
                <SelectTrigger id="vehicle-status" className="w-full lg:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATUSES}>Svi statusi</SelectItem>
                  {VEHICLE_STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {VEHICLE_STATUS_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vehicle-sort" className="text-xs">
                Sortiranje
              </Label>
              <Select
                value={sort}
                onValueChange={(value) => {
                  setSort(value as `${VehicleSortField}:${SortOrder}`);
                  setPage(1);
                }}
              >
                <SelectTrigger id="vehicle-sort" className="w-full lg:w-44">
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
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
              aria-label="Osveži listu vozila"
            >
              <RefreshCw className={cn('size-4', query.isFetching && 'animate-spin')} aria-hidden />
              Osveži
            </Button>
          </div>

          {query.isError ? (
            <ErrorState
              error={query.error}
              title="Lista vozila nije učitana"
              retryLabel="Pokušaj ponovo"
              retryingLabel="Učitavanje…"
              onRetry={() => void query.refetch()}
              isRetrying={query.isFetching}
            />
          ) : (
            <VehiclesTable
              vehicles={vehicles}
              isLoading={query.isPending}
              hasSearch={search.length > 0 || Boolean(status) || Boolean(type)}
              onRequestDelete={setVehicleToDelete}
              emptyAction={
                <Button size="sm" asChild>
                  <Link href="/vehicles/new">Dodaj vozilo</Link>
                </Button>
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
      </Card>

      <DeleteVehicleDialog
        vehicle={vehicleToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setVehicleToDelete(null);
          }
        }}
      />
    </>
  );
}
