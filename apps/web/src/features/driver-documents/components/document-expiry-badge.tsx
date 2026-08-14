import { getDocumentExpiryUrgency } from '@rental-admin/shared';

import { Badge } from '@/components/ui/badge';
import { formatExpiryLabel } from '@/features/driver-documents/lib/document';
import { cn } from '@/lib/utils';

const URGENCY_CLASS = {
  expired: 'border-transparent bg-destructive/10 text-destructive',
  critical: 'border-transparent bg-destructive/10 text-destructive',
  warning: 'border-transparent bg-amber-500/10 text-amber-800 dark:text-amber-300',
  ok: 'border-transparent bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  none: 'text-muted-foreground',
} as const;

interface DocumentExpiryBadgeProps {
  expiresAt: string | null;
  todayIso: string;
}

export function DocumentExpiryBadge({ expiresAt, todayIso }: DocumentExpiryBadgeProps) {
  const urgency = getDocumentExpiryUrgency(expiresAt, todayIso);

  return (
    <Badge variant="secondary" className={cn('font-normal', URGENCY_CLASS[urgency])}>
      {formatExpiryLabel(expiresAt, todayIso)}
    </Badge>
  );
}
