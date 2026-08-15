'use client';

import { ALARM_TOP_N, topAlarms } from '@rental-admin/shared';
import { ArrowRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlarmTopList } from '@/features/alarms/components/alarm-top-list';
import { useAlarms } from '@/features/alarms/hooks/use-alarms';
import { cn } from '@/lib/utils';

const SUMMARY = [
  { key: 'expired' as const, label: 'Isteklo', className: 'text-destructive' },
  { key: 'critical' as const, label: 'Crveno', className: 'text-destructive' },
  { key: 'warning' as const, label: 'Žuto', className: 'text-[#a16207] dark:text-[#facc15]' },
] as const;

export function AlarmWidget() {
  const query = useAlarms();
  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const top = useMemo(() => topAlarms(items, ALARM_TOP_N), [items]);
  const counts = query.data?.counts;

  return (
    <Card className="shadow-none">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Najhitniji rokovi</CardTitle>
            <CardDescription>
              Top {ALARM_TOP_N} dokumenata i pregleda koji ističu. Puna lista je u Alarm centru.
            </CardDescription>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
              aria-label="Osveži alarme"
            >
              <RefreshCw className={cn('size-4', query.isFetching && 'animate-spin')} aria-hidden />
              Osveži
            </Button>
            <Button asChild size="sm">
              <Link href="/alarms">
                Alarm centar
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {SUMMARY.map((item) => (
            <div
              key={item.key}
              className="bg-muted/60 flex items-baseline gap-2 rounded-lg px-3 py-2"
            >
              <span className={cn('font-heading text-xl font-semibold tabular-nums', item.className)}>
                {query.isPending ? '—' : (counts?.[item.key] ?? 0)}
              </span>
              <span className="text-muted-foreground text-xs">{item.label}</span>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {query.isError ? (
          <ErrorState
            error={query.error}
            title="Alarmi nisu učitani"
            retryLabel="Pokušaj ponovo"
            retryingLabel="Učitavanje…"
            onRetry={() => void query.refetch()}
            isRetrying={query.isFetching}
          />
        ) : (
          <AlarmTopList items={top} isLoading={query.isPending} />
        )}
      </CardContent>
    </Card>
  );
}
