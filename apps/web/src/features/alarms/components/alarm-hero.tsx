import type { AlarmCounts } from '@rental-admin/shared';
import { Settings2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface AlarmHeroProps {
  today: string | undefined;
  counts: AlarmCounts | undefined;
  isLoading: boolean;
}

const TILES = [
  { key: 'expired' as const, label: 'Isteklo', hint: 'Već van roka', tone: 'destructive' },
  { key: 'critical' as const, label: 'Crveno', hint: 'Hitno — kratak rok', tone: 'destructive' },
  { key: 'warning' as const, label: 'Žuto', hint: 'Upozorenje', tone: 'warning' },
  { key: 'ok' as const, label: 'U roku', hint: 'Prati se', tone: 'ok' },
];

export function AlarmHero({ today, counts, isLoading }: AlarmHeroProps) {
  return (
    <section className="bg-sidebar text-sidebar-foreground relative overflow-hidden rounded-3xl px-5 py-7 md:px-8 md:py-9">
      <div
        className="bg-primary/25 pointer-events-none absolute -top-24 -right-16 size-72 rounded-full blur-3xl"
        aria-hidden
      />
      <div
        className="bg-accent/20 pointer-events-none absolute -bottom-28 left-[30%] size-64 rounded-full blur-3xl"
        aria-hidden
      />

      <div className="relative flex flex-col gap-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sidebar-foreground/55 text-[11px] font-medium tracking-[0.22em] uppercase">
              Komandni centar
            </p>
            <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
              Alarm centar
            </h1>
            <p className="text-sidebar-foreground/70 max-w-xl text-sm">
              Svi rokovi vozača i vozila na jednom mestu. Crveno i žuto prate pragove koje
              definišete u podešavanjima.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sidebar-foreground/60 text-sm tabular-nums">
              {today ? formatDate(today) : '—'}
            </p>
            <Button
              asChild
              size="sm"
              variant="secondary"
              className="bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 border-0"
            >
              <Link href="/settings">
                <Settings2 className="size-4" aria-hidden />
                Pragovi
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {TILES.map((tile) => {
            const value = counts?.[tile.key];

            return (
              <div
                key={tile.key}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm"
              >
                <p className="text-sidebar-foreground/55 text-xs font-medium tracking-wide uppercase">
                  {tile.label}
                </p>
                {isLoading ? (
                  <Skeleton className="mt-3 h-10 w-16 bg-white/10" />
                ) : (
                  <p
                    className={cn(
                      'font-heading mt-1 text-4xl font-semibold tracking-tight tabular-nums',
                      tile.tone === 'destructive' && (value ?? 0) > 0 && 'text-destructive',
                      tile.tone === 'warning' && (value ?? 0) > 0 && 'text-[#facc15]',
                      tile.tone === 'ok' && 'text-accent',
                    )}
                  >
                    {value ?? 0}
                  </p>
                )}
                <p className="text-sidebar-foreground/50 mt-1 text-xs">{tile.hint}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
