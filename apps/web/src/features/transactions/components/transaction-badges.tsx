'use client';

import {
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
  type TransactionDto,
} from '@rental-admin/shared';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TransactionTypeBadgeProps {
  type: TransactionDto['type'];
  className?: string;
}

export function TransactionTypeBadge({ type, className }: TransactionTypeBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        type === 'INCOME'
          ? 'border-transparent bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
          : 'border-transparent bg-rose-500/10 text-rose-800 dark:text-rose-300',
        className,
      )}
    >
      {TRANSACTION_TYPE_LABELS[type]}
    </Badge>
  );
}

interface AdvanceStatusBadgeProps {
  transaction: Pick<TransactionDto, 'isAdvance' | 'status'>;
  className?: string;
}

export function AdvanceStatusBadge({ transaction, className }: AdvanceStatusBadgeProps) {
  if (!transaction.isAdvance) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        transaction.status === 'SETTLED'
          ? 'border-transparent bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
          : 'border-transparent bg-amber-500/10 text-amber-800 dark:text-amber-300',
        className,
      )}
    >
      {TRANSACTION_STATUS_LABELS[transaction.status]}
    </Badge>
  );
}
