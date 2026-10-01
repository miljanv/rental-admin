'use client';

import { type SortOrder, type SupplierDto, type SupplierSortField } from '@rental-admin/shared';
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
import { DeleteSupplierDialog } from '@/features/suppliers/components/delete-supplier-dialog';
import { SupplierLedgerSheet } from '@/features/suppliers/components/supplier-ledger-sheet';
import { SuppliersTable } from '@/features/suppliers/components/suppliers-table';
import { useSuppliers } from '@/features/suppliers/hooks/use-suppliers';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;

const SORT_OPTIONS: { value: `${SupplierSortField}:${SortOrder}`; label: string }[] = [
  { value: 'createdAt:desc', label: 'Najnoviji' },
  { value: 'createdAt:asc', label: 'Najstariji' },
  { value: 'name:asc', label: 'Naziv A-Z' },
  { value: 'name:desc', label: 'Naziv Z-A' },
];

export function SuppliersList() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<`${SupplierSortField}:${SortOrder}`>('createdAt:desc');
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierDto | null>(null);
  const [supplierToView, setSupplierToView] = useState<SupplierDto | null>(null);

  const [sortBy, sortOrder] = sort.split(':') as [SupplierSortField, SortOrder];

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const query = useSuppliers({
    page,
    limit: PAGE_SIZE,
    sortBy,
    sortOrder,
    ...(search ? { search } : {}),
  });

  const suppliers = query.data?.suppliers ?? [];
  const pagination = query.data?.pagination;
  const totalPages = pagination?.totalPages ?? 0;
  const total = pagination?.total ?? 0;

  return (
    <>
      <PageHeader
        title="Dobavljači"
        description="Evidencija dobavljača za troškove, gorivo i finansijske izvode."
        actions={
          <Button asChild>
            <Link href="/suppliers/new">
              <Plus className="size-4" aria-hidden />
              Novi dobavljač
            </Link>
          </Button>
        }
      />

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Svi dobavljači</CardTitle>
          <CardDescription>
            {total === 0
              ? 'Još nema unetih dobavljača.'
              : `${total} ${total === 1 ? 'dobavljač' : 'dobavljača'} u evidenciji.`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-0">
          <div className="flex flex-col gap-3 px-6 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="supplier-search" className="text-xs">
                Pretraga
              </Label>
              <div className="relative">
                <Search
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                  aria-hidden
                />
                <Input
                  id="supplier-search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Naziv, email, telefon, PIB, matični broj ili mesto"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="supplier-sort" className="text-xs">
                Sortiranje
              </Label>
              <Select
                value={sort}
                onValueChange={(value) => {
                  setSort(value as `${SupplierSortField}:${SortOrder}`);
                  setPage(1);
                }}
              >
                <SelectTrigger id="supplier-sort" className="w-full lg:w-40">
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
              aria-label="Osveži listu dobavljača"
            >
              <RefreshCw className={cn('size-4', query.isFetching && 'animate-spin')} aria-hidden />
              Osveži
            </Button>
          </div>

          {query.isError ? (
            <ErrorState
              error={query.error}
              title="Lista dobavljača nije učitana"
              retryLabel="Pokušaj ponovo"
              retryingLabel="Učitavanje…"
              onRetry={() => void query.refetch()}
              isRetrying={query.isFetching}
            />
          ) : (
            <SuppliersTable
              suppliers={suppliers}
              isLoading={query.isPending}
              hasSearch={search.length > 0}
              onOpenLedger={setSupplierToView}
              onRequestDelete={setSupplierToDelete}
              emptyAction={
                <Button size="sm" asChild>
                  <Link href="/suppliers/new">Dodaj dobavljača</Link>
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

      <DeleteSupplierDialog
        supplier={supplierToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSupplierToDelete(null);
          }
        }}
      />
      <SupplierLedgerSheet
        supplier={supplierToView}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSupplierToView(null);
          }
        }}
      />
    </>
  );
}
