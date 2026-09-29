'use client';

import {
  PAYMENT_METHOD_LABELS,
  TRANSACTION_CATEGORY_LABELS,
  TRANSACTION_SOURCE_TYPE_LABELS,
  type TransactionDto,
} from '@rental-admin/shared';
import { Eye, Link2, MoreHorizontal, Pencil, Printer, Trash2, Wallet } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { TableSkeleton } from '@/components/common/table-skeleton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AdvanceStatusBadge,
  TransactionTypeBadge,
} from '@/features/transactions/components/transaction-badges';
import { vehicleLabel } from '@/features/vehicles/lib/vehicle';
import { formatDate, formatMoney } from '@/lib/format';

const COLUMN_COUNT = 10;

const counterpartyLabel = (transaction: TransactionDto): string =>
  transaction.supplier ??
  transaction.partner ??
  (transaction.vehicle ? vehicleLabel(transaction.vehicle) : '—');

interface DetailItemProps {
  label: string;
  value: React.ReactNode;
}

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="space-y-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="break-words text-sm font-medium">{value || '—'}</dd>
    </div>
  );
}

function TransactionDetailsSheet({
  transaction,
  onOpenChange,
}: {
  transaction: TransactionDto | null;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const statementLabel = transaction
    ? [transaction.statementNumber, transaction.bankReference].filter(Boolean).join(' · ')
    : '';

  return (
    <Sheet open={Boolean(transaction)} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Detalji transakcije</SheetTitle>
          <SheetDescription>
            {transaction
              ? `${formatDate(transaction.occurredAt)} · ${formatMoney(transaction.amount)}`
              : ''}
          </SheetDescription>
        </SheetHeader>
        {transaction ? (
          <dl className="grid gap-4 overflow-y-auto px-4 pb-4 sm:grid-cols-2">
            <DetailItem label="Datum" value={formatDate(transaction.occurredAt)} />
            <DetailItem label="Iznos" value={formatMoney(transaction.amount)} />
            <DetailItem label="Tip" value={<TransactionTypeBadge type={transaction.type} />} />
            <DetailItem
              label="Kategorija"
              value={TRANSACTION_CATEGORY_LABELS[transaction.category]}
            />
            <DetailItem label="Plaćanje" value={PAYMENT_METHOD_LABELS[transaction.paymentMethod]} />
            <DetailItem label="Partner / dobavljač" value={counterpartyLabel(transaction)} />
            <DetailItem label="Partner ID" value={transaction.partnerId} />
            <DetailItem label="Dobavljač" value={transaction.supplier} />
            <DetailItem label="Partner" value={transaction.partner} />
            <DetailItem label="Relacija" value={transaction.route} />
            <DetailItem
              label="Vozilo"
              value={transaction.vehicle ? vehicleLabel(transaction.vehicle) : null}
            />
            <DetailItem
              label="Vozač"
              value={
                transaction.driver
                  ? `${transaction.driver.firstName} ${transaction.driver.lastName}`
                  : null
              }
            />
            <DetailItem label="Broj izvoda / referenca" value={statementLabel} />
            <DetailItem label="Broj izvoda" value={transaction.statementNumber} />
            <DetailItem label="Bankarska referenca" value={transaction.bankReference} />
            <DetailItem
              label="Izvor"
              value={TRANSACTION_SOURCE_TYPE_LABELS[transaction.sourceType]}
            />
            <DetailItem
              label="Status avansa"
              value={<AdvanceStatusBadge transaction={transaction} />}
            />
            <DetailItem label="Rasknjiženo" value={formatMoney(transaction.allocatedAmount)} />
            <DetailItem label="Nerasknjiženo" value={formatMoney(transaction.unallocatedAmount)} />
            <DetailItem label="Broj rasknjižavanja" value={String(transaction.allocationCount)} />
            <DetailItem label="Ugovor" value={transaction.contractId} />
            <DetailItem label="Interni ID" value={transaction.id} />
            <DetailItem label="Opis" value={transaction.note} />
          </dl>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

interface TransactionsTableProps {
  transactions: TransactionDto[];
  isLoading: boolean;
  hasFilters: boolean;
  onEdit: (transaction: TransactionDto) => void;
  onAllocate: (transaction: TransactionDto) => void;
  onPrintCashReceipt: (transaction: TransactionDto) => void;
  onRequestDelete: (transaction: TransactionDto) => void;
  emptyAction?: React.ReactNode;
}

export function TransactionsTable({
  transactions,
  isLoading,
  hasFilters,
  onEdit,
  onAllocate,
  onPrintCashReceipt,
  onRequestDelete,
  emptyAction,
}: TransactionsTableProps) {
  const [transactionToView, setTransactionToView] = useState<TransactionDto | null>(null);

  if (!isLoading && transactions.length === 0) {
    return hasFilters ? (
      <EmptyState
        icon={Wallet}
        title="Nema rezultata"
        description="Nijedna transakcija ne odgovara filterima. Promenite period ili kategoriju."
      />
    ) : (
      <EmptyState
        icon={Wallet}
        title="Još nema transakcija"
        description="Ručni unos ili knjiženja iz točenja, delova i pregleda pojaviće se ovde."
        action={emptyAction}
      />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[92px]">Datum</TableHead>
            <TableHead className="w-[92px]">Tip</TableHead>
            <TableHead className="w-[112px]">Kategorija</TableHead>
            <TableHead className="w-[120px] text-right">Iznos</TableHead>
            <TableHead className="w-[88px]">Plaćanje</TableHead>
            <TableHead className="min-w-[240px]">Partner / dobavljač</TableHead>
            <TableHead className="min-w-[220px]">Izvod</TableHead>
            <TableHead className="w-[110px]">Avans</TableHead>
            <TableHead className="w-[120px]">Izvor</TableHead>
            <TableHead className="w-[60px] text-right">Akcije</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeleton rows={5} columns={COLUMN_COUNT} />
          ) : (
            transactions.map((transaction) => {
              const isManual = transaction.sourceType === 'MANUAL';
              const isBankStatement = transaction.sourceType === 'BANK_STATEMENT';
              const canEdit = (isManual && transaction.status !== 'SETTLED') || isBankStatement;
              const canAllocate =
                (isManual || isBankStatement) && transaction.unallocatedAmount > 0.005;
              const canPrintCashReceipt = transaction.paymentMethod === 'CASH';
              const statementLabel = [transaction.statementNumber, transaction.bankReference]
                .filter(Boolean)
                .join(' · ');

              return (
                <TableRow key={transaction.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDate(transaction.occurredAt)}
                  </TableCell>
                  <TableCell>
                    <TransactionTypeBadge type={transaction.type} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {TRANSACTION_CATEGORY_LABELS[transaction.category]}
                  </TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap">
                    {formatMoney(transaction.amount)}
                  </TableCell>
                  <TableCell>{PAYMENT_METHOD_LABELS[transaction.paymentMethod]}</TableCell>
                  <TableCell className="max-w-[320px] truncate">
                    {counterpartyLabel(transaction)}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[300px] truncate">
                    {statementLabel || '—'}
                  </TableCell>
                  <TableCell>
                    <AdvanceStatusBadge transaction={transaction} />
                    {!transaction.isAdvance && transaction.allocationCount > 0 ? (
                      <span className="text-muted-foreground block text-xs">
                        {formatMoney(transaction.allocatedAmount)}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {TRANSACTION_SOURCE_TYPE_LABELS[transaction.sourceType]}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Akcije">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setTransactionToView(transaction)}>
                          <Eye className="size-4" />
                          Detalji
                        </DropdownMenuItem>
                        {canAllocate ? (
                          <DropdownMenuItem onClick={() => onAllocate(transaction)}>
                            <Link2 className="size-4" />
                            Rasknjiži
                          </DropdownMenuItem>
                        ) : null}
                        {canPrintCashReceipt ? (
                          <DropdownMenuItem onClick={() => onPrintCashReceipt(transaction)}>
                            <Printer className="size-4" />
                            Isplatnica
                          </DropdownMenuItem>
                        ) : null}
                        {canEdit ? (
                          <>
                            <DropdownMenuItem onClick={() => onEdit(transaction)}>
                              <Pencil className="size-4" />
                              Izmeni
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => onRequestDelete(transaction)}
                            >
                              <Trash2 className="size-4" />
                              Obriši
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      <TransactionDetailsSheet
        transaction={transactionToView}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setTransactionToView(null);
          }
        }}
      />
    </>
  );
}
