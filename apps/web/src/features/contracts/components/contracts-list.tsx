'use client';

import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUSES,
  partnerSelectLabel,
  type ContractDto,
  type ContractSortField,
  type ContractStatus,
  type SortOrder,
} from '@rental-admin/shared';
import { Plus, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { DateField } from '@/components/common/date-field';
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
import { ContractsTable } from '@/features/contracts/components/contracts-table';
import { DeleteContractDialog } from '@/features/contracts/components/delete-contract-dialog';
import { useContracts } from '@/features/contracts/hooks/use-contracts';
import { usePartners } from '@/features/partners/hooks/use-partners';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;
const ALL_STATUSES = 'all';
const ALL_PARTNERS = 'all';

const SORT_OPTIONS: { value: `${ContractSortField}:${SortOrder}`; label: string }[] = [
  { value: 'createdAt:desc', label: 'Najnoviji' },
  { value: 'createdAt:asc', label: 'Najstariji' },
  { value: 'serviceStartDate:asc', label: 'Početak usluge (raniji)' },
  { value: 'serviceStartDate:desc', label: 'Početak usluge (kasniji)' },
  { value: 'conclusionDate:desc', label: 'Datum zaključenja' },
  { value: 'status:asc', label: 'Status' },
];

export function ContractsList() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<typeof ALL_STATUSES | ContractStatus>(
    ALL_STATUSES,
  );
  const [partnerFilter, setPartnerFilter] = useState<typeof ALL_PARTNERS | string>(ALL_PARTNERS);
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [sort, setSort] = useState<`${ContractSortField}:${SortOrder}`>('createdAt:desc');
  const [contractToDelete, setContractToDelete] = useState<ContractDto | null>(null);

  const [sortBy, sortOrder] = sort.split(':') as [ContractSortField, SortOrder];
  const status = statusFilter === ALL_STATUSES ? undefined : statusFilter;
  const partnerId = partnerFilter === ALL_PARTNERS ? undefined : partnerFilter;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const partnersQuery = usePartners({ page: 1, limit: 100, sortBy: 'type', sortOrder: 'asc' });
  const partners = partnersQuery.data?.partners ?? [];

  const query = useContracts({
    page,
    limit: PAGE_SIZE,
    sortBy,
    sortOrder,
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(partnerId ? { partnerId } : {}),
    ...(periodFrom ? { periodFrom } : {}),
    ...(periodTo ? { periodTo } : {}),
  });

  const contracts = query.data?.contracts ?? [];
  const pagination = query.data?.pagination;
  const totalPages = pagination?.totalPages ?? 0;
  const total = pagination?.total ?? 0;
  const hasFilters =
    search.length > 0 || Boolean(status) || Boolean(partnerId) || Boolean(periodFrom) || Boolean(periodTo);

  return (
    <>
      <PageHeader
        title="Ugovori"
        description="Ugovori o prevozu putnika."
        actions={
          <Button asChild>
            <Link href="/contracts/new">
              <Plus className="size-4" aria-hidden />
              Novi ugovor
            </Link>
          </Button>
        }
      />

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Svi ugovori</CardTitle>
          <CardDescription>
            {total === 0 ? 'Još nema unetih ugovora.' : `${total} ${total === 1 ? 'ugovor' : 'ugovora'}.`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-0">
          <div className="flex flex-col gap-3 px-6 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="min-w-[220px] flex-1 space-y-1.5">
              <Label htmlFor="contract-search" className="text-xs">
                Pretraga
              </Label>
              <div className="relative">
                <Search
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                  aria-hidden
                />
                <Input
                  id="contract-search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Relacija ili naziv/ime naručioca"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contract-status" className="text-xs">
                Status
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as typeof ALL_STATUSES | ContractStatus);
                  setPage(1);
                }}
              >
                <SelectTrigger id="contract-status" className="w-full lg:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATUSES}>Svi statusi</SelectItem>
                  {CONTRACT_STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {CONTRACT_STATUS_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contract-partner" className="text-xs">
                Partner
              </Label>
              <Select
                value={partnerFilter}
                onValueChange={(value) => {
                  setPartnerFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="contract-partner" className="w-full lg:w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_PARTNERS}>Svi partneri</SelectItem>
                  {partners.map((partner) => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partnerSelectLabel(partner)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {partnersQuery.isError ? (
                <p className="text-destructive text-xs">Partneri nisu učitani.</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contract-period-from" className="text-xs">
                Period od
              </Label>
              <DateField
                id="contract-period-from"
                value={periodFrom}
                onChange={(value) => {
                  setPeriodFrom(value);
                  setPage(1);
                }}
                className="w-full lg:w-40"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contract-period-to" className="text-xs">
                Period do
              </Label>
              <DateField
                id="contract-period-to"
                value={periodTo}
                onChange={(value) => {
                  setPeriodTo(value);
                  setPage(1);
                }}
                className="w-full lg:w-40"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contract-sort" className="text-xs">
                Sortiranje
              </Label>
              <Select
                value={sort}
                onValueChange={(value) => {
                  setSort(value as `${ContractSortField}:${SortOrder}`);
                  setPage(1);
                }}
              >
                <SelectTrigger id="contract-sort" className="w-full lg:w-56">
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
              aria-label="Osveži listu ugovora"
            >
              <RefreshCw className={cn('size-4', query.isFetching && 'animate-spin')} aria-hidden />
              Osveži
            </Button>
          </div>

          {query.isError ? (
            <ErrorState
              error={query.error}
              title="Lista ugovora nije učitana"
              retryLabel="Pokušaj ponovo"
              retryingLabel="Učitavanje…"
              onRetry={() => void query.refetch()}
              isRetrying={query.isFetching}
            />
          ) : (
            <ContractsTable
              contracts={contracts}
              isLoading={query.isPending}
              hasFilters={hasFilters}
              onRequestDelete={setContractToDelete}
              emptyAction={
                <Button size="sm" asChild>
                  <Link href="/contracts/new">Kreiraj ugovor</Link>
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

      <DeleteContractDialog
        contract={contractToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setContractToDelete(null);
          }
        }}
      />
    </>
  );
}
