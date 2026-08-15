'use client';

import {
  PAYMENT_METHOD_LABELS,
  TRANSACTION_CATEGORY_LABELS,
  TRANSACTION_SOURCE_TYPE_LABELS,
  type TransactionDto,
} from '@rental-admin/shared';
import { MoreHorizontal, Pencil, Trash2, Wallet } from 'lucide-react';

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

const COLUMN_COUNT = 9;

interface TransactionsTableProps {
  transactions: TransactionDto[];
  isLoading: boolean;
  hasFilters: boolean;
  onEdit: (transaction: TransactionDto) => void;
  onRequestDelete: (transaction: TransactionDto) => void;
  emptyAction?: React.ReactNode;
}

export function TransactionsTable({
  transactions,
  isLoading,
  hasFilters,
  onEdit,
  onRequestDelete,
  emptyAction,
}: TransactionsTableProps) {
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Datum</TableHead>
          <TableHead>Tip</TableHead>
          <TableHead>Kategorija</TableHead>
          <TableHead className="text-right">Iznos</TableHead>
          <TableHead>Plaćanje</TableHead>
          <TableHead>Dobavljač</TableHead>
          <TableHead>Avans</TableHead>
          <TableHead>Izvor</TableHead>
          <TableHead className="w-[60px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={5} columns={COLUMN_COUNT} />
        ) : (
          transactions.map((transaction) => {
            const isManual = transaction.sourceType === 'MANUAL';
            const canEdit = isManual && transaction.status !== 'SETTLED';

            return (
              <TableRow key={transaction.id}>
                <TableCell className="text-muted-foreground">
                  {formatDate(transaction.occurredAt)}
                </TableCell>
                <TableCell>
                  <TransactionTypeBadge type={transaction.type} />
                </TableCell>
                <TableCell>{TRANSACTION_CATEGORY_LABELS[transaction.category]}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatMoney(transaction.amount)}
                </TableCell>
                <TableCell>{PAYMENT_METHOD_LABELS[transaction.paymentMethod]}</TableCell>
                <TableCell className="max-w-[140px] truncate">
                  {transaction.supplier ?? (transaction.vehicle ? vehicleLabel(transaction.vehicle) : '—')}
                </TableCell>
                <TableCell>
                  <AdvanceStatusBadge transaction={transaction} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {TRANSACTION_SOURCE_TYPE_LABELS[transaction.sourceType]}
                </TableCell>
                <TableCell className="text-right">
                  {canEdit ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Akcije">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className="text-muted-foreground sr-only">Bez akcija</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
