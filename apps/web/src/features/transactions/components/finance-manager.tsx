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
import { DeleteTransactionDialog } from '@/features/transactions/components/delete-transaction-dialog';
import { FinanceExportMenu } from '@/features/transactions/components/finance-export-menu';
import { FinanceOverview } from '@/features/transactions/components/finance-overview';
import { BankStatementEntryForm } from '@/features/transactions/components/bank-statement-entry-form';
import { BankStatementImportCard } from '@/features/transactions/components/bank-statement-import-card';
import { PaymentAllocationPanel } from '@/features/transactions/components/payment-allocation-panel';
import { SettleAdvancesDialog } from '@/features/transactions/components/settle-advances-dialog';
import { TransactionForm } from '@/features/transactions/components/transaction-form';
import { TransactionsTable } from '@/features/transactions/components/transactions-table';
import { UnsettledAdvancesCard } from '@/features/transactions/components/unsettled-advances-card';
import { useTransactions } from '@/features/transactions/hooks/use-transactions';
import { formatDate, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;
const ALL = 'all';
const FINANCE_TABS = [
  { id: 'overview', label: 'Pregled' },
  { id: 'ledger', label: 'Transakcije' },
  { id: 'statements', label: 'Izvodi' },
  { id: 'cash', label: 'Keš' },
] as const;

type FinanceTabId = (typeof FINANCE_TABS)[number]['id'];

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

export function FinanceManager() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<typeof ALL | TransactionType>(ALL);
  const [categoryFilter, setCategoryFilter] = useState<typeof ALL | TransactionCategory>(ALL);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isStatementFormOpen, setIsStatementFormOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<TransactionDto | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<TransactionDto | null>(null);
  const [transactionToAllocate, setTransactionToAllocate] = useState<TransactionDto | null>(null);
  const [groupToSettle, setGroupToSettle] = useState<UnsettledAdvanceGroupDto | null>(null);
  const [activeTab, setActiveTab] = useState<FinanceTabId>('overview');

  const type = typeFilter === ALL ? undefined : typeFilter;
  const category = categoryFilter === ALL ? undefined : categoryFilter;
  const sourceType = activeTab === 'statements' ? 'BANK_STATEMENT' : undefined;
  const paymentMethod = activeTab === 'cash' ? 'CASH' : undefined;

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
    ...(sourceType ? { sourceType } : {}),
    ...(paymentMethod ? { paymentMethod } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  });

  const transactions = query.data?.transactions ?? [];
  const pagination = query.data?.pagination;
  const totalPages = pagination?.totalPages ?? 0;
  const total = pagination?.total ?? 0;
  const showStatementForm =
    isStatementFormOpen || transactionToEdit?.sourceType === 'BANK_STATEMENT';
  const showTransactionForm =
    isFormOpen || (transactionToEdit !== null && transactionToEdit.sourceType !== 'BANK_STATEMENT');
  const showForm = showStatementForm || showTransactionForm;

  const closeForm = () => {
    setIsFormOpen(false);
    setIsStatementFormOpen(false);
    setTransactionToEdit(null);
  };

  const printCashReceipt = (transaction: TransactionDto) => {
    const title = transaction.type === 'INCOME' ? 'Potvrda o prijemu novca' : 'Isplatnica';
    const counterparty =
      transaction.partner ?? transaction.supplier ?? transaction.route ?? transaction.note ?? '';
    const popup = window.open('', '_blank', 'width=760,height=900');

    if (!popup) {
      return;
    }

    popup.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #111; }
    h1 { font-size: 24px; margin: 0 0 24px; text-transform: uppercase; }
    .row { display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding: 10px 0; gap: 24px; }
    .label { color: #555; }
    .value { font-weight: 700; text-align: right; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; margin-top: 72px; }
    .line { border-top: 1px solid #111; padding-top: 8px; text-align: center; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="row"><span class="label">Datum</span><span class="value">${formatDate(
    transaction.occurredAt,
  )}</span></div>
  <div class="row"><span class="label">Iznos</span><span class="value">${formatMoney(
    transaction.amount,
  )}</span></div>
  <div class="row"><span class="label">Stranka</span><span class="value">${escapeHtml(
    counterparty || '-',
  )}</span></div>
  <div class="row"><span class="label">Opis</span><span class="value">${escapeHtml(
    transaction.note ?? '-',
  )}</span></div>
  <div class="row"><span class="label">Interni broj</span><span class="value">${escapeHtml(
    transaction.id,
  )}</span></div>
  <div class="signatures">
    <div class="line">Predao</div>
    <div class="line">Primio</div>
  </div>
  <script>window.print();</script>
</body>
</html>`);
    popup.document.close();
  };

  return (
    <>
      <PageHeader
        title="Finansije"
        description="Finansijski promet preko izvoda, ručne transakcije i odvojeni pregled prihoda i rashoda."
        actions={
          showForm || activeTab === 'overview' ? null : activeTab === 'statements' ? (
            <Button onClick={() => setIsStatementFormOpen(true)}>
              <Plus className="size-4" aria-hidden />
              Nova stavka izvoda
            </Button>
          ) : (
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="size-4" aria-hidden />
              {activeTab === 'cash' ? 'Nova keš stavka' : 'Nova transakcija'}
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

      {activeTab === 'ledger' || activeTab === 'statements' || activeTab === 'cash' ? (
        <>
          {transactionToAllocate ? (
            <PaymentAllocationPanel
              transaction={transactionToAllocate}
              onDone={() => setTransactionToAllocate(null)}
            />
          ) : null}

          {showTransactionForm ? (
            <div className="mb-6">
              <TransactionForm
                transaction={transactionToEdit ?? undefined}
                onDone={closeForm}
                fixedPaymentMethod={activeTab === 'cash' ? 'CASH' : undefined}
                title={
                  activeTab === 'cash'
                    ? transactionToEdit
                      ? 'Izmena keš stavke'
                      : 'Nova keš stavka'
                    : undefined
                }
                description={
                  activeTab === 'cash'
                    ? 'Keš primanja i isplate vode se odvojeno od bankarskih izvoda.'
                    : undefined
                }
              />
            </div>
          ) : null}

          {showStatementForm ? (
            <div className="mb-6">
              <BankStatementEntryForm
                transaction={transactionToEdit ?? undefined}
                onDone={closeForm}
              />
            </div>
          ) : null}

          {activeTab === 'ledger' ? (
            <div className="mb-6">
              <UnsettledAdvancesCard onSettle={setGroupToSettle} />
            </div>
          ) : null}

          {activeTab === 'statements' ? (
            <div className="mb-6">
              <BankStatementImportCard />
            </div>
          ) : null}

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>
                {activeTab === 'statements'
                  ? 'Bankarski izvodi'
                  : activeTab === 'cash'
                    ? 'Keš evidencija'
                    : 'Sve transakcije'}
              </CardTitle>
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
                  <DateField
                    id="from"
                    value={from}
                    onChange={(value) => {
                      setFrom(value);
                      setPage(1);
                    }}
                  />
                </div>

                <div className="space-y-1.5 lg:w-40">
                  <Label htmlFor="to" className="text-xs">
                    Do
                  </Label>
                  <DateField
                    id="to"
                    value={to}
                    onChange={(value) => {
                      setTo(value);
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
                  <RefreshCw
                    className={cn('size-4', query.isFetching && 'animate-spin')}
                    aria-hidden
                  />
                  Osveži
                </Button>
                <FinanceExportMenu
                  params={{
                    ...(search ? { search } : {}),
                    ...(type ? { type } : {}),
                    ...(category ? { category } : {}),
                    ...(sourceType ? { sourceType } : {}),
                    ...(paymentMethod ? { paymentMethod } : {}),
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
                  hasFilters={
                    search.length > 0 ||
                    Boolean(type) ||
                    Boolean(category) ||
                    Boolean(from) ||
                    Boolean(to)
                  }
                  onEdit={setTransactionToEdit}
                  onAllocate={setTransactionToAllocate}
                  onPrintCashReceipt={printCashReceipt}
                  onRequestDelete={setTransactionToDelete}
                  emptyAction={
                    <Button
                      size="sm"
                      onClick={() =>
                        activeTab === 'statements'
                          ? setIsStatementFormOpen(true)
                          : setIsFormOpen(true)
                      }
                    >
                      {activeTab === 'statements'
                        ? 'Dodaj stavku izvoda'
                        : activeTab === 'cash'
                          ? 'Dodaj keš stavku'
                          : 'Dodaj transakciju'}
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
