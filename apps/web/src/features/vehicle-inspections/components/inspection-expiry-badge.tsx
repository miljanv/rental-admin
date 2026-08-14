import { getDocumentExpiryUrgency } from '@rental-admin/shared';

import { Badge } from '@/components/ui/badge';
import { formatExpiryLabel } from '@/features/vehicle-inspections/lib/inspection';
import { cn } from '@/lib/utils';

const URGENCY_CLASS = {
  expired: 'border-transparent bg-destructive/10 text-destructive',
  critical: 'border-transparent bg-destructive/10 text-destructive',
  warning: 'border-transparent bg-amber-500/10 text-amber-800 dark:text-amber-300',
  ok: 'border-transparent bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  none: 'text-muted-foreground',
} as const;

interface InspectionExpiryBadgeProps {
  expiresAt: string;
  todayIso: string;
}

export function InspectionExpiryBadge({ expiresAt, todayIso }: InspectionExpiryBadgeProps) {
  const urgency = getDocumentExpiryUrgency(expiresAt, todayIso);

  return (
    <Badge variant="secondary" className={cn('font-normal', URGENCY_CLASS[urgency])}>
      {formatExpiryLabel(expiresAt, todayIso)}
    </Badge>
  );
}
