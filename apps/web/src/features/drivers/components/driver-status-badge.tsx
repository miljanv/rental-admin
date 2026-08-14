import { DRIVER_STATUS_LABELS, type DriverStatus } from '@rental-admin/shared';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_CLASS: Record<DriverStatus, string> = {
  ACTIVE: 'border-transparent bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  SICK_LEAVE: 'border-transparent bg-amber-500/10 text-amber-800 dark:text-amber-300',
  VACATION: 'border-transparent bg-sky-500/10 text-sky-800 dark:text-sky-300',
  INACTIVE: 'text-muted-foreground',
};

interface DriverStatusBadgeProps {
  status: DriverStatus;
  className?: string;
}

export function DriverStatusBadge({ status, className }: DriverStatusBadgeProps) {
  return (
    <Badge variant="secondary" className={cn(STATUS_CLASS[status], className)}>
      {DRIVER_STATUS_LABELS[status]}
    </Badge>
  );
}
