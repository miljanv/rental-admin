'use client';

import {
  TRANSACTION_CATEGORIES,
  TRANSACTION_CATEGORY_LABELS,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPES,
  type TransactionCategory,
  type TransactionDto,
  type TransactionType,
  type UnsettledAdvanceGroupDto,
} from '@rental-admin/shared';
import { Plus, RefreshCw } from 'lucide-react';
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
import { DeleteTransactionDialog } from '@/features/transactions/components/delete-transaction-dialog';
import { FinanceExportMenu } from '@/features/transactions/components/finance-export-menu';
import { FinanceOverview } from '@/features/transactions/components/finance-overview';
import { SettleAdvancesDialog } from '@/features/transactions/components/settle-advances-dialog';
import { TransactionForm } from '@/features/transactions/components/transaction-form';
import { TransactionsTable } from '@/features/transactions/components/transactions-table';
import { UnsettledAdvancesCard } from '@/features/transactions/components/unsettled-advances-card';
import { useTransactions } from '@/features/transactions/hooks/use-transactions';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;
const ALL = 'all';
const FINANCE_TABS = [
  { id: 'overview', label: 'Pregled' },
  { id: 'ledger', label: 'Transakcije' },
] as const;

type FinanceTabId = (typeof FINANCE_TABS)[number]['id'];

export function FinanceManager() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<typeof ALL | TransactionType>(ALL);
  const [categoryFilter, setCategoryFilter] = useState<typeof ALL | TransactionCategory>(ALL);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<TransactionDto | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<TransactionDto | null>(null);
  const [groupToSettle, setGroupToSettle] = useState<UnsettledAdvanceGroupDto | null>(null);
  const [activeTab, setActiveTab] = useState<FinanceTabId>('overview');

  const type = typeFilter === ALL ? undefined : typeFilter;
  const category = categoryFilter === ALL ? undefined : categoryFilter;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const query = useTransactions({
    page,
    limit: PAGE_SIZE,
    sortBy: 'occurredAt',
    sortOrder: 'desc',
    ...(search ? { search } : {}),
    ...(type ? { type } : {}),
    ...(category ? { category } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  });

  const transactions = query.data?.transactions ?? [];
  const pagination = query.data?.pagination;
  const totalPages = pagination?.totalPages ?? 0;
  const total = pagination?.total ?? 0;
  const showForm = isFormOpen || transactionToEdit !== null;

  const closeForm = () => {
    setIsFormOpen(false);
    setTransactionToEdit(null);
  };

  return (
    <>
      <PageHeader
        title="Finansije"
        description="Prihodi, rashodi i avansne uplate dobavljačima. Način plaćanja se vodi po svakoj transakciji."
        actions={
          showForm || activeTab !== 'ledger' ? null : (
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="size-4" aria-hidden />
              Nova transakcija
            </Button>
          )
        }
      />

      <div className="mb-6 flex gap-1 overflow-x-auto border-b">
        {FINANCE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'shrink-0 border-b-2 px-3 py-2 text-sm transition-colors',
              activeTab === tab.id
                ? 'border-primary text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? <FinanceOverview onSettleAdvance={setGroupToSettle} /> : null}

      {activeTab === 'ledger' ? (
        <>
      {showForm ? (
        <div className="mb-6">
          <TransactionForm transaction={transactionToEdit ?? undefined} onDone={closeForm} />
        </div>
      ) : null}

      <div className="mb-6">
        <UnsettledAdvancesCard onSettle={setGroupToSettle} />
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Sve transakcije</CardTitle>
          <CardDescription>
            {total === 0
              ? 'Još nema knjiženja.'
              : `${total} ${total === 1 ? 'transakcija' : 'transakcija'} u evidenciji.`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-0">
          <div className="flex flex-col gap-3 px-6 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="transaction-search" className="text-xs">
                Pretraga
              </Label>
              <Input
                id="transaction-search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Dobavljač ili napomena"
              />
            </div>

            <div className="space-y-1.5 lg:w-40">
              <Label className="text-xs">Tip</Label>
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value as typeof ALL | TransactionType);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Svi tipovi</SelectItem>
                  {TRANSACTION_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {TRANSACTION_TYPE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 lg:w-48">
              <Label className="text-xs">Kategorija</Label>
              <Select
                value={categoryFilter}
                onValueChange={(value) => {
                  setCategoryFilter(value as typeof ALL | TransactionCategory);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Sve kategorije</SelectItem>
                  {TRANSACTION_CATEGORIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {TRANSACTION_CATEGORY_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 lg:w-40">
              <Label htmlFor="from" className="text-xs">
                Od
              </Label>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="space-y-1.5 lg:w-40">
              <Label htmlFor="to" className="text-xs">
                Do
              </Label>
              <Input
                id="to"
                type="date"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            <Button
              variant="outline"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
              aria-label="Osveži listu transakcija"
            >
              <RefreshCw className={cn('size-4', query.isFetching && 'animate-spin')} aria-hidden />
              Osveži
            </Button>
            <FinanceExportMenu
              params={{
                ...(search ? { search } : {}),
                ...(type ? { type } : {}),
                ...(category ? { category } : {}),
                ...(from ? { from } : {}),
                ...(to ? { to } : {}),
              }}
            />
          </div>

          {query.isError ? (
            <ErrorState
              error={query.error}
              title="Lista transakcija nije učitana"
              retryLabel="Pokušaj ponovo"
              retryingLabel="Učitavanje…"
              onRetry={() => void query.refetch()}
              isRetrying={query.isFetching}
            />
          ) : (
            <TransactionsTable
              transactions={transactions}
              isLoading={query.isPending}
              hasFilters={search.length > 0 || Boolean(type) || Boolean(category) || Boolean(from) || Boolean(to)}
              onEdit={setTransactionToEdit}
              onRequestDelete={setTransactionToDelete}
              emptyAction={
                <Button size="sm" onClick={() => setIsFormOpen(true)}>
                  Dodaj transakciju
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
        </>
      ) : null}

      <DeleteTransactionDialog
        transaction={transactionToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setTransactionToDelete(null);
          }
        }}
      />

      <SettleAdvancesDialog
        group={groupToSettle}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setGroupToSettle(null);
          }
        }}
      />
    </>
  );
}
