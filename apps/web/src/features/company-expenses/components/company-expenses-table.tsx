'use client';

import {
  PAYMENT_METHOD_LABELS,
  type CompanyExpenseDto,
} from '@rental-admin/shared';
import { MoreHorizontal, Pencil, ReceiptText, Trash2 } from 'lucide-react';
import Link from 'next/link';

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
import { vehicleLabel } from '@/features/vehicles/lib/vehicle';
import { formatDate, formatMoney } from '@/lib/format';

interface CompanyExpensesTableProps {
  expenses: CompanyExpenseDto[];
  isLoading: boolean;
  showVehicle?: boolean;
  readOnly?: boolean;
  onEdit?: (expense: CompanyExpenseDto) => void;
  onRequestDelete?: (expense: CompanyExpenseDto) => void;
  emptyAction?: React.ReactNode;
}

export function CompanyExpensesTable({
  expenses,
  isLoading,
  showVehicle = false,
  readOnly = false,
  onEdit,
  onRequestDelete,
  emptyAction,
}: CompanyExpensesTableProps) {
  const columnCount = (showVehicle ? 10 : 9) + (readOnly ? 0 : 1);

  if (!isLoading && expenses.length === 0) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="Još nema evidentiranih troškova"
        description="Dodajte račune i keš troškove koji ulaze u troškove firme."
        action={emptyAction}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Datum računa</TableHead>
          <TableHead>Broj računa</TableHead>
          {showVehicle ? <TableHead>Mesto utroška</TableHead> : null}
          <TableHead>Dobavljač</TableHead>
          <TableHead>Opis</TableHead>
          <TableHead className="text-right">Km</TableHead>
          <TableHead className="text-right">Bez PDV-a</TableHead>
          <TableHead className="text-right">PDV</TableHead>
          <TableHead className="text-right">Ukupno</TableHead>
          <TableHead>Način</TableHead>
          {readOnly ? null : <TableHead className="w-[60px] text-right">Akcije</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={5} columns={columnCount} />
        ) : (
          expenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell className="text-muted-foreground">{formatDate(expense.issuedAt)}</TableCell>
              <TableCell className="text-muted-foreground">
                {expense.invoiceNumber ?? '—'}
              </TableCell>
              {showVehicle ? (
                <TableCell>
                  {expense.vehicle ? (
                    <Link href={`/vehicles/${expense.vehicle.id}`} className="hover:underline">
                      {vehicleLabel(expense.vehicle)}
                    </Link>
                  ) : (
                    'Zajednički trošak'
                  )}
                </TableCell>
              ) : null}
              <TableCell className="max-w-[140px] truncate">{expense.supplier}</TableCell>
              <TableCell className="max-w-[220px] truncate">{expense.description}</TableCell>
              <TableCell className="text-right tabular-nums">
                {expense.odometerKm !== null
                  ? `${expense.odometerKm.toLocaleString('sr-RS')} km`
                  : '—'}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(expense.amountWithoutVat)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(expense.vatAmount)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(expense.amountWithVat)}
              </TableCell>
              <TableCell>{PAYMENT_METHOD_LABELS[expense.paymentMethod]}</TableCell>
              {readOnly || !onEdit || !onRequestDelete ? null : (
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Akcije za trošak ${expense.supplier}`}
                      >
                        <MoreHorizontal className="size-4" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem className="gap-2" onClick={() => onEdit(expense)}>
                        <Pencil className="size-4" aria-hidden />
                        Izmeni
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        className="gap-2"
                        onClick={() => onRequestDelete(expense)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                        Obriši
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
