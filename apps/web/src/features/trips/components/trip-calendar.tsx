'use client';

import { TRIP_STATUS_LABELS, TRIP_STATUSES, type TripDto, type TripStatus } from '@rental-admin/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TRIP_STATUS_CLASS } from '@/features/trips/components/trip-status-badge';
import { useTrips } from '@/features/trips/hooks/use-trips';
import { tripLabel, tripRouteLabel } from '@/features/trips/lib/trip';
import { formatMonthYear } from '@/lib/format';
import { cn } from '@/lib/utils';

const NONE = 'none';
const WEEKDAY_HEADER = ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'];
const CELL_COUNT = 42;
const VISIBLE_TRIPS_PER_DAY = 3;

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

/** Six full weeks (Monday-first) covering the given UTC month, including lead/trail days. */
function buildMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const leadDays = (firstOfMonth.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, month, 1 - leadDays));

  return Array.from({ length: CELL_COUNT }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return date;
  });
}

export function TripCalendar() {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getUTCFullYear());
  const [month, setMonth] = useState(today.getUTCMonth());
  const [status, setStatus] = useState<TripStatus | ''>('');

  const days = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const from = toIsoDate(days[0] ?? new Date());
  const to = toIsoDate(days[CELL_COUNT - 1] ?? new Date());
  const todayIso = toIsoDate(today);

  const query = useTrips({
    page: 1,
    limit: 100,
    sortBy: 'departureDate',
    sortOrder: 'asc',
    from,
    to,
    status: status || undefined,
  });

  const tripsByDate = useMemo(() => {
    const map = new Map<string, TripDto[]>();

    for (const trip of query.data?.trips ?? []) {
      const bucket = map.get(trip.departureDate) ?? [];
      bucket.push(trip);
      map.set(trip.departureDate, bucket);
    }

    return map;
  }, [query.data]);

  const goToPreviousMonth = () => {
    if (month === 0) {
      setYear((value) => value - 1);
      setMonth(11);
    } else {
      setMonth((value) => value - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 11) {
      setYear((value) => value + 1);
      setMonth(0);
    } else {
      setMonth((value) => value + 1);
    }
  };

  const goToToday = () => {
    setYear(today.getUTCFullYear());
    setMonth(today.getUTCMonth());
  };

  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title="Kalendar nije učitan"
        retryLabel="Pokušaj ponovo"
        retryingLabel="Učitavanje…"
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  const total = query.data?.pagination.total ?? 0;
  const shown = query.data?.trips.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth} aria-label="Prethodni mesec">
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <p className="w-40 text-center text-sm font-medium capitalize">{formatMonthYear(year, month + 1)}</p>
          <Button variant="outline" size="icon" onClick={goToNextMonth} aria-label="Sledeći mesec">
            <ChevronRight className="size-4" aria-hidden />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Danas
          </Button>
        </div>

        <Select value={status || NONE} onValueChange={(value) => setStatus(value === NONE ? '' : (value as TripStatus))}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Svi statusi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Svi statusi</SelectItem>
            {TRIP_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {TRIP_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {total > shown ? (
        <p className="text-muted-foreground text-xs">
          Prikazano {shown} od {total} vožnji u ovom periodu — koristite tabelu za kompletnu listu.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border">
        <div className="bg-muted grid grid-cols-7 border-b">
          {WEEKDAY_HEADER.map((label) => (
            <div key={label} className="text-muted-foreground p-2 text-center text-xs font-medium">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((date) => {
            const iso = toIsoDate(date);
            const isCurrentMonth = date.getUTCMonth() === month;
            const isToday = iso === todayIso;
            const dayTrips = tripsByDate.get(iso) ?? [];
            const visibleTrips = dayTrips.slice(0, VISIBLE_TRIPS_PER_DAY);
            const hiddenCount = dayTrips.length - visibleTrips.length;

            return (
              <div
                key={iso}
                className={cn(
                  'min-h-[112px] space-y-1 border-r border-b p-1.5 last:border-r-0',
                  !isCurrentMonth && 'bg-muted/30',
                )}
              >
                <p
                  className={cn(
                    'text-xs',
                    isCurrentMonth ? 'text-foreground' : 'text-muted-foreground',
                    isToday &&
                      'bg-primary text-primary-foreground inline-flex size-5 items-center justify-center rounded-full font-medium',
                  )}
                >
                  {date.getUTCDate()}
                </p>

                {query.isPending ? null : (
                  <div className="space-y-1">
                    {visibleTrips.map((trip) => (
                      <Link
                        key={trip.id}
                        href={`/trips/${trip.id}`}
                        title={tripLabel(trip)}
                        className={cn(
                          'block truncate rounded px-1 py-0.5 text-[10px] leading-tight',
                          TRIP_STATUS_CLASS[trip.status],
                        )}
                      >
                        {tripRouteLabel(trip)}
                      </Link>
                    ))}
                    {hiddenCount > 0 ? (
                      <p className="text-muted-foreground px-1 text-[10px]">+{hiddenCount} više</p>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
