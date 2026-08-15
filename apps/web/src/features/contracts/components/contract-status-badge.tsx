import { CONTRACT_STATUS_LABELS, type ContractStatus } from '@rental-admin/shared';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_CLASS: Record<ContractStatus, string> = {
  DRAFT: 'text-muted-foreground',
  SIGNED: 'border-transparent bg-sky-500/10 text-sky-800 dark:text-sky-300',
  IN_PROGRESS: 'border-transparent bg-amber-500/10 text-amber-800 dark:text-amber-300',
  COMPLETED: 'border-transparent bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  CANCELLED: 'border-transparent bg-red-500/10 text-red-800 dark:text-red-300',
};

interface ContractStatusBadgeProps {
  status: ContractStatus;
  className?: string;
}

export function ContractStatusBadge({ status, className }: ContractStatusBadgeProps) {
  return (
    <Badge variant="secondary" className={cn(STATUS_CLASS[status], className)}>
      {CONTRACT_STATUS_LABELS[status]}
    </Badge>
  );
}
