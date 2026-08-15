import type { AlarmItemDto } from '@rental-admin/shared';
import { ArrowUpRight, Radar } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/common/empty-state';
import { AlarmUrgencyBadge } from '@/features/alarms/components/alarm-urgency-badge';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface AlarmTopListProps {
  items: AlarmItemDto[];
  isLoading: boolean;
}

const countdownCopy = (days: number): { value: string; hint: string } => {
  if (days < 0) {
    return { value: String(Math.abs(days)), hint: days === -1 ? 'dan kasni' : 'dana kasni' };
  }

  if (days === 0) {
    return { value: '0', hint: 'ističe danas' };
  }

  return { value: String(days), hint: days === 1 ? 'dan ostalo' : 'dana ostalo' };
};

const TONE: Record<AlarmItemDto['urgency'], string> = {
  expired: 'from-destructive/15 to-transparent',
  critical: 'from-destructive/10 to-transparent',
  warning: 'from-[#ca8a04]/15 to-transparent',
  ok: 'from-accent/10 to-transparent',
};

const BAR: Record<AlarmItemDto['urgency'], string> = {
  expired: 'bg-destructive',
  critical: 'bg-destructive',
  warning: 'bg-[#ca8a04]',
  ok: 'bg-accent',
};

export function AlarmTopList({ items, isLoading }: AlarmTopListProps) {
  if (!isLoading && items.length === 0) {
    return (
      <EmptyState
        icon={Radar}
        title="Nema aktivnih rokova"
        description="Kad se unesu dokumenti vozača ili pregledi vozila, najhitniji će stati ovde."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-muted/60 h-36 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const countdown = countdownCopy(item.daysUntil);
        const subject = item.driver?.label ?? item.vehicle?.label ?? '—';

        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              'group relative overflow-hidden rounded-2xl border bg-card p-4 shadow-none transition-colors',
              'hover:border-foreground/20 focus-visible:ring-ring/50 outline-none focus-visible:ring-2',
            )}
          >
            <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br', TONE[item.urgency])} />
            <span className={cn('absolute inset-y-0 left-0 w-1', BAR[item.urgency])} />

            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="font-heading text-4xl font-semibold tracking-tight tabular-nums">
                  {countdown.value}
                </p>
                <p className="text-muted-foreground text-xs">{countdown.hint}</p>
              </div>
              <AlarmUrgencyBadge urgency={item.urgency} />
            </div>

            <div className="relative mt-4 space-y-1">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="text-muted-foreground truncate text-xs">{subject}</p>
              <p className="text-muted-foreground text-xs tabular-nums">{formatDate(item.expiresAt)}</p>
            </div>

            <ArrowUpRight
              className="text-muted-foreground group-hover:text-foreground absolute right-3 bottom-3 size-4 opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden
            />
          </Link>
        );
      })}
    </div>
  );
}
