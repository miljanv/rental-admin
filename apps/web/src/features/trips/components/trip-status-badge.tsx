import { TRIP_STATUS_LABELS, type TripStatus } from '@rental-admin/shared';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** Shared status → color mapping, reused by the badge, the calendar cells, and the month chart legend. */
export const TRIP_STATUS_CLASS: Record<TripStatus, string> = {
  PLANNED: 'border-transparent bg-blue-500/10 text-blue-800 dark:text-blue-300',
  IN_PROGRESS: 'border-transparent bg-amber-500/10 text-amber-800 dark:text-amber-300',
  COMPLETED: 'border-transparent bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  CANCELLED: 'border-transparent bg-red-500/10 text-red-800 line-through dark:text-red-300',
  FREE: 'text-muted-foreground',
};

interface TripStatusBadgeProps {
  status: TripStatus;
  className?: string;
}

export function TripStatusBadge({ status, className }: TripStatusBadgeProps) {
  return (
    <Badge variant="secondary" className={cn(TRIP_STATUS_CLASS[status], className)}>
      {TRIP_STATUS_LABELS[status]}
    </Badge>
  );
}
