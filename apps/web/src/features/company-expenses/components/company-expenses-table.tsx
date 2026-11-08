'use client';

import {
  PAYMENT_METHOD_LABELS,
  COMPANY_EXPENSE_SCOPE_LABELS,
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
import { formatDate, formatMoney, formatMonthYear } from '@/lib/format';

interface CompanyExpensesTableProps {
  expenses: CompanyExpenseDto[];
  isLoading: boolean;
  showVehicle?: boolean;
  readOnly?: boolean;
  onEdit?: (expense: CompanyExpenseDto) => void;
  onRequestDelete?: (expense: CompanyExpenseDto) => void;
  emptyAction?: React.ReactNode;
  /** Split the list into months of the supply date, each with its subtotal. */
  groupBySupplyMonth?: boolean;
}

export type ExpenseTableRow =
  | { type: 'expense'; expense: CompanyExpenseDto }
  | {
      type: 'group';
      key: string;
      label: string;
      count: number;
      withoutVat: number;
      vat: number;
      total: number;
    };

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

/** Supply date, or the invoice date for older bills without one (same rule as VAT). */
const supplyMonthDate = (expense: CompanyExpenseDto): string =>
  expense.supplyDate ?? expense.issuedAt;

const plainRows = (expenses: CompanyExpenseDto[]): ExpenseTableRow[] =>
  expenses.map((expense) => ({ type: 'expense', expense }));

export const groupedBySupplyMonth = (expenses: CompanyExpenseDto[]): ExpenseTableRow[] => {
  const sorted = [...expenses].sort(
    (left, right) =>
      supplyMonthDate(right).localeCompare(supplyMonthDate(left)) ||
      right.issuedAt.localeCompare(left.issuedAt),
  );
  const rows: ExpenseTableRow[] = [];
  let group = null as Extract<ExpenseTableRow, { type: 'group' }> | null;

  for (const expense of sorted) {
    const key = supplyMonthDate(expense).slice(0, 7);

    if (group?.key !== key) {
      group = {
        type: 'group',
        key,
        label: formatMonthYear(Number(key.slice(0, 4)), Number(key.slice(5, 7))),
        count: 0,
        withoutVat: 0,
        vat: 0,
        total: 0,
      };
      rows.push(group);
    }

    group.count += 1;
    group.withoutVat = roundMoney(group.withoutVat + expense.amountWithoutVat);
    group.vat = roundMoney(group.vat + expense.vatAmount);
    group.total = roundMoney(group.total + expense.amountWithVat);
    rows.push({ type: 'expense', expense });
  }

  return rows;
};

export function CompanyExpensesTable({
  expenses,
  isLoading,
  showVehicle = false,
  readOnly = false,
  onEdit,
  onRequestDelete,
  emptyAction,
  groupBySupplyMonth = false,
}: CompanyExpensesTableProps) {
  const columnCount = (showVehicle ? 11 : 10) + (readOnly ? 0 : 1);

  const leadingColumns = showVehicle ? 7 : 6;
  const trailingColumns = readOnly ? 1 : 2;
  const rows = groupBySupplyMonth ? groupedBySupplyMonth(expenses) : plainRows(expenses);

  const renderExpense = (expense: CompanyExpenseDto) => (
    <TableRow key={expense.id}>
      <TableCell>
        {expense.supplyDate ? (
          formatDate(expense.supplyDate)
        ) : (
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Nedostaje</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">{formatDate(expense.issuedAt)}</TableCell>
      <TableCell className="text-muted-foreground">{expense.invoiceNumber ?? '—'}</TableCell>
      {showVehicle ? (
        <TableCell>
          {expense.vehicle ? (
            <Link href={`/vehicles/${expense.vehicle.id}`} className="hover:underline">
              {vehicleLabel(expense.vehicle)}
            </Link>
          ) : (
            COMPANY_EXPENSE_SCOPE_LABELS[expense.scope]
          )}
        </TableCell>
      ) : null}
      <TableCell className="max-w-[140px] truncate">{expense.supplier}</TableCell>
      <TableCell className="max-w-[220px] truncate">{expense.description}</TableCell>
      <TableCell className="text-right tabular-nums">
        {expense.odometerKm !== null ? `${expense.odometerKm.toLocaleString('sr-RS')} km` : '—'}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatMoney(expense.amountWithoutVat)}
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatMoney(expense.vatAmount)}</TableCell>
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
  );

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
          <TableHead>Datum prometa</TableHead>
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
          rows.map((row) =>
            row.type === 'group' ? (
              <TableRow key={`group-${row.key}`} className="bg-muted/50 hover:bg-muted/50">
                <TableCell colSpan={leadingColumns} className="font-medium">
                  {row.label}
                  <span className="text-muted-foreground ml-2 text-xs font-normal">
                    {row.count} {row.count === 1 ? 'račun' : 'računa'}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatMoney(row.withoutVat)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatMoney(row.vat)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatMoney(row.total)}
                </TableCell>
                <TableCell colSpan={trailingColumns} />
              </TableRow>
            ) : (
              renderExpense(row.expense)
            ),
          )
        )}
      </TableBody>
    </Table>
  );
}
