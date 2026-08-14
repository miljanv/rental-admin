import { VEHICLE_STATUS_LABELS, type VehicleStatus } from '@rental-admin/shared';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_CLASS: Record<VehicleStatus, string> = {
  ACTIVE: 'border-transparent bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  IN_SERVICE: 'border-transparent bg-amber-500/10 text-amber-800 dark:text-amber-300',
  OUT_OF_SERVICE: 'text-muted-foreground',
};

interface VehicleStatusBadgeProps {
  status: VehicleStatus;
  className?: string;
}

export function VehicleStatusBadge({ status, className }: VehicleStatusBadgeProps) {
  return (
    <Badge variant="secondary" className={cn(STATUS_CLASS[status], className)}>
      {VEHICLE_STATUS_LABELS[status]}
    </Badge>
  );
}
