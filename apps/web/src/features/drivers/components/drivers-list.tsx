'use client';

import {
  DRIVER_STATUS_LABELS,
  DRIVER_STATUSES,
  type DriverDto,
  type DriverSortField,
  type DriverStatus,
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
import { DeleteDriverDialog } from '@/features/drivers/components/delete-driver-dialog';
import { DriversTable } from '@/features/drivers/components/drivers-table';
import { useDrivers } from '@/features/drivers/hooks/use-drivers';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;
const ALL_STATUSES = 'all';

const SORT_OPTIONS: { value: `${DriverSortField}:${SortOrder}`; label: string }[] = [
  { value: 'lastName:asc', label: 'Prezime A–Š' },
  { value: 'lastName:desc', label: 'Prezime Š–A' },
  { value: 'createdAt:desc', label: 'Najnoviji' },
  { value: 'createdAt:asc', label: 'Najstariji' },
  { value: 'status:asc', label: 'Status' },
];

export function DriversList() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<typeof ALL_STATUSES | DriverStatus>(
    ALL_STATUSES,
  );
  const [sort, setSort] = useState<`${DriverSortField}:${SortOrder}`>('lastName:asc');
  const [driverToDelete, setDriverToDelete] = useState<DriverDto | null>(null);

  const [sortBy, sortOrder] = sort.split(':') as [DriverSortField, SortOrder];
  const status = statusFilter === ALL_STATUSES ? undefined : statusFilter;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const query = useDrivers({
    page,
    limit: PAGE_SIZE,
    sortBy,
    sortOrder,
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
  });

  const drivers = query.data?.drivers ?? [];
  const pagination = query.data?.pagination;
  const totalPages = pagination?.totalPages ?? 0;
  const total = pagination?.total ?? 0;

  return (
    <>
      <PageHeader
        title="Zaposleni"
        description="Osnovni podaci, status i evidencija zaposlenih."
        actions={
          <Button asChild>
            <Link href="/drivers/new">
              <Plus className="size-4" aria-hidden />
              Novi zaposleni
            </Link>
          </Button>
        }
      />

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Svi zaposleni</CardTitle>
          <CardDescription>
            {total === 0
              ? 'Još nema unetih zaposlenih.'
              : `${total} ${total === 1 ? 'zaposleni' : 'zaposlenih'} u evidenciji.`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-0">
          <div className="flex flex-col gap-3 px-6 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="driver-search" className="text-xs">
                Pretraga
              </Label>
              <div className="relative">
                <Search
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                  aria-hidden
                />
                <Input
                  id="driver-search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Ime, prezime, JMBG, telefon ili email"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="driver-status" className="text-xs">
                Status
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as typeof ALL_STATUSES | DriverStatus);
                  setPage(1);
                }}
              >
                <SelectTrigger id="driver-status" className="w-full lg:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATUSES}>Svi statusi</SelectItem>
                  {DRIVER_STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {DRIVER_STATUS_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="driver-sort" className="text-xs">
                Sortiranje
              </Label>
              <Select
                value={sort}
                onValueChange={(value) => {
                  setSort(value as `${DriverSortField}:${SortOrder}`);
                  setPage(1);
                }}
              >
                <SelectTrigger id="driver-sort" className="w-full lg:w-44">
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
              aria-label="Osveži listu zaposlenih"
            >
              <RefreshCw className={cn('size-4', query.isFetching && 'animate-spin')} aria-hidden />
              Osveži
            </Button>
          </div>

          {query.isError ? (
            <ErrorState
              error={query.error}
              title="Lista zaposlenih nije učitana"
              retryLabel="Pokušaj ponovo"
              retryingLabel="Učitavanje…"
              onRetry={() => void query.refetch()}
              isRetrying={query.isFetching}
            />
          ) : (
            <DriversTable
              drivers={drivers}
              isLoading={query.isPending}
              hasSearch={search.length > 0 || Boolean(status)}
              onRequestDelete={setDriverToDelete}
              emptyAction={
                <Button size="sm" asChild>
                  <Link href="/drivers/new">Dodaj zaposlenog</Link>
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

      <DeleteDriverDialog
        driver={driverToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDriverToDelete(null);
          }
        }}
      />
    </>
  );
}
