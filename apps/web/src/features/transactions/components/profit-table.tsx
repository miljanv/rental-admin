'use client';

import { ArrowDown, ArrowUp, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface ProfitTableRow {
  id: string;
  label: string;
  income: number;
  expense: number;
  profit: number;
  count: number;
}

type SortField = 'label' | 'income' | 'expense' | 'profit';
type SortDir = 'asc' | 'desc';

interface ProfitTableProps {
  rows: ProfitTableRow[];
  emptyTitle: string;
  emptyDescription: string;
  emptyIcon: LucideIcon;
  labelHeader: string;
}

export function ProfitTable({
  rows,
  emptyTitle,
  emptyDescription,
  emptyIcon: EmptyIcon,
  labelHeader,
}: ProfitTableProps) {
  const [sortField, setSortField] = useState<SortField>('profit');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    const copy = [...rows];

    copy.sort((left, right) => {
      const direction = sortDir === 'asc' ? 1 : -1;

      if (sortField === 'label') {
        return left.label.localeCompare(right.label, 'sr') * direction;
      }

      return (left[sortField] - right[sortField]) * direction;
    });

    return copy;
  }, [rows, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDir(field === 'label' ? 'asc' : 'desc');
  };

  if (rows.length === 0) {
    return <EmptyState icon={EmptyIcon} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead label={labelHeader} field="label" active={sortField} dir={sortDir} onSort={toggleSort} />
          <SortableHead
            label="Prihod"
            field="income"
            active={sortField}
            dir={sortDir}
            onSort={toggleSort}
            numeric
          />
          <SortableHead
            label="Rashod"
            field="expense"
            active={sortField}
            dir={sortDir}
            onSort={toggleSort}
            numeric
          />
          <SortableHead
            label="Profit"
            field="profit"
            active={sortField}
            dir={sortDir}
            onSort={toggleSort}
            numeric
          />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="max-w-[220px] truncate font-medium">{row.label}</TableCell>
            <TableCell className="text-right">{formatMoney(row.income)}</TableCell>
            <TableCell className="text-right">{formatMoney(row.expense)}</TableCell>
            <TableCell
              className={cn(
                'text-right font-medium',
                row.profit < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300',
              )}
            >
              {formatMoney(row.profit)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface SortableHeadProps {
  label: string;
  field: SortField;
  active: SortField;
  dir: SortDir;
  onSort: (field: SortField) => void;
  numeric?: boolean;
}

function SortableHead({ label, field, active, dir, onSort, numeric }: SortableHeadProps) {
  const isActive = active === field;
  const Icon = dir === 'asc' ? ArrowUp : ArrowDown;

  return (
    <TableHead className={numeric ? 'text-right' : undefined}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          'inline-flex items-center gap-1 hover:text-foreground',
          numeric && 'ml-auto',
          isActive ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
        {isActive ? <Icon className="size-3" aria-hidden /> : null}
      </button>
    </TableHead>
  );
}
