'use client';

import {
  TRIP_EXPENSE_CATEGORY_LABELS,
  TRIP_EXPENSE_PAYMENT_METHOD_LABELS,
  type TripExpenseDto,
} from '@rental-admin/shared';
import { Download, Eye, MoreHorizontal, Pencil, Receipt, Trash2 } from 'lucide-react';

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
import { useDownloadVehicleScan } from '@/features/vehicles/hooks/use-download-vehicle-scan';
import { usePreviewVehicleScan } from '@/features/vehicles/hooks/use-preview-vehicle-scan';
import { formatMoney } from '@/lib/format';

const COLUMN_COUNT = 5;

interface TripExpensesTableProps {
  expenses: TripExpenseDto[];
  isLoading: boolean;
  onEdit: (expense: TripExpenseDto) => void;
  onRequestDelete: (expense: TripExpenseDto) => void;
  emptyAction?: React.ReactNode;
}

export function TripExpensesTable({
  expenses,
  isLoading,
  onEdit,
  onRequestDelete,
  emptyAction,
}: TripExpensesTableProps) {
  const downloadMutation = useDownloadVehicleScan();
  const previewMutation = usePreviewVehicleScan();
  const isScanBusy = downloadMutation.isPending || previewMutation.isPending;

  if (!isLoading && expenses.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Još nema troškova"
        description="Dodajte gorivo, putarinu, parking i ostale troškove ove vožnje."
        action={emptyAction}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Kategorija</TableHead>
          <TableHead>Iznos</TableHead>
          <TableHead>Način plaćanja</TableHead>
          <TableHead>Napomena</TableHead>
          <TableHead className="w-[60px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={3} columns={COLUMN_COUNT} />
        ) : (
          expenses.map((expense) => {
            const scan = expense.file;

            return (
              <TableRow key={expense.id}>
                <TableCell>{TRIP_EXPENSE_CATEGORY_LABELS[expense.category]}</TableCell>
                <TableCell>{formatMoney(expense.amount)}</TableCell>
                <TableCell>{TRIP_EXPENSE_PAYMENT_METHOD_LABELS[expense.paymentMethod]}</TableCell>
                <TableCell className="max-w-[220px] truncate">{expense.note ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-xs" aria-label="Akcije troška">
                        <MoreHorizontal className="size-4" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(expense)}>
                        <Pencil className="size-4" aria-hidden />
                        Izmeni
                      </DropdownMenuItem>
                      {scan ? (
                        <>
                          <DropdownMenuItem
                            disabled={isScanBusy}
                            onClick={() => {
                              const tab = window.open('', '_blank');
                              previewMutation.mutate({ fileId: scan.id, tab });
                            }}
                          >
                            <Eye className="size-4" aria-hidden />
                            Pregledaj račun
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={isScanBusy}
                            onClick={() => downloadMutation.mutate({ fileId: scan.id })}
                          >
                            <Download className="size-4" aria-hidden />
                            Preuzmi račun
                          </DropdownMenuItem>
                        </>
                      ) : null}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => onRequestDelete(expense)}>
                        <Trash2 className="size-4" aria-hidden />
                        Obriši
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
