import type { AlarmUrgency } from '@rental-admin/shared';
import { ALARM_URGENCY_LABELS } from '@rental-admin/shared';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const URGENCY_CLASS: Record<AlarmUrgency, string> = {
  expired: 'border-transparent bg-destructive/15 text-destructive',
  critical: 'border-transparent bg-destructive/10 text-destructive',
  warning: 'border-transparent bg-[#ca8a04]/15 text-[#a16207] dark:text-[#facc15]',
  ok: 'border-transparent bg-accent/15 text-accent-foreground dark:text-accent',
};

interface AlarmUrgencyBadgeProps {
  urgency: AlarmUrgency;
  className?: string;
}

export function AlarmUrgencyBadge({ urgency, className }: AlarmUrgencyBadgeProps) {
  return (
    <Badge variant="outline" className={cn('font-medium', URGENCY_CLASS[urgency], className)}>
      {ALARM_URGENCY_LABELS[urgency]}
    </Badge>
  );
}
