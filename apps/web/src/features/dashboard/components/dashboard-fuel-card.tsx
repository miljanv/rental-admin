import type { DashboardFuelConsumptionDto } from '@rental-admin/shared';
import { Fuel, TrendingDown, TrendingUp } from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface DashboardFuelCardProps {
  mode: 'lowest' | 'highest';
  from: string;
  to: string;
  items: DashboardFuelConsumptionDto[];
}

const consumption = (value: number): string =>
  `${value.toLocaleString('sr-Latn', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L/100 km`;

export function DashboardFuelCard({ mode, from, to, items }: DashboardFuelCardProps) {
  const ranked = mode === 'lowest' ? items : [...items].reverse();
  const visible = ranked.slice(0, 5);
  const leading = visible[0];
  const isLowest = mode === 'lowest';
  const Icon = isLowest ? TrendingDown : TrendingUp;
  const accentClass = isLowest ? 'before:bg-teal-500' : 'before:bg-orange-500';
  const iconClass = isLowest
    ? 'bg-teal-500/10 text-teal-700 ring-teal-500/15 dark:text-teal-300'
    : 'bg-orange-500/10 text-orange-700 ring-orange-500/15 dark:text-orange-300';
  const metricClass = isLowest
    ? 'bg-teal-500/[0.07] ring-teal-500/15'
    : 'bg-orange-500/[0.07] ring-orange-500/15';

  return (
    <Card
      size="sm"
      className={cn(
        'relative shadow-[0_16px_36px_-30px_rgba(12,19,21,0.65)] before:absolute before:inset-x-0 before:top-0 before:h-1',
        accentClass,
      )}
    >
      <CardHeader className="border-b">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg shadow-sm ring-1',
              iconClass,
            )}
          >
            <Icon className="size-4.5" aria-hidden />
          </span>
          <div>
            <CardTitle>
              {isLowest ? 'Najmanja potrošnja vozila' : 'Najveća potrošnja vozila'}
            </CardTitle>
            <CardDescription className="text-xs">
              Dizel · {formatDate(from)} – {formatDate(to)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
        <div className={cn('rounded-lg p-3 ring-1', metricClass)}>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {isLowest ? 'Minimum' : 'Maksimum'}
          </p>
          {leading ? (
            <>
              <p className="font-heading mt-1 text-2xl font-semibold tracking-tight tabular-nums 2xl:text-3xl">
                {consumption(leading.avgConsumptionPer100Km)}
              </p>
              <p className="text-muted-foreground mt-1 truncate text-xs">{leading.vehicleLabel}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {items.length} {items.length === 1 ? 'vozilo ima' : 'vozila imaju'} obračun
              </p>
            </>
          ) : (
            <div className="text-muted-foreground mt-6 flex items-center gap-2 text-sm">
              <Fuel className="size-4" aria-hidden />
              Nema dovoljno podataka.
            </div>
          )}
        </div>
        <div>
          <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
            Top 5
          </p>
          <ol className="space-y-1">
            {visible.map((item, index) => (
              <li key={item.vehicleId}>
                <Link
                  href={`/vehicles/${item.vehicleId}`}
                  className="flex items-center gap-2 rounded-md border border-transparent bg-muted/35 px-2 py-1.5 transition-colors hover:border-foreground/10 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="text-muted-foreground w-4 shrink-0 text-right text-xs tabular-nums">
                    {index + 1}.
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {item.vehicleLabel}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {consumption(item.avgConsumptionPer100Km)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
