'use client';

import { DRIVER_REPORT_STATUS_LABELS, type DriverPortalTripDto } from '@rental-admin/shared';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalMessage } from '@/features/driver-portal/components/portal-shell';
import {
  PortalCard,
  PortalChip,
  PortalRow,
  PortalSectionLabel,
  PortalStat,
  type PortalTone,
} from '@/features/driver-portal/components/portal-ui';
import { usePortalTrips } from '@/features/driver-portal/hooks/use-portal-trips';
import {
  advanceBalance,
  formatPortalAmount,
  kmProgress,
  portalHref,
  portalRouteLabel,
  shortDateRange,
  tripDayProgress,
} from '@/features/driver-portal/lib/portal';
import { getApiErrorMessage } from '@/lib/api-error';
import { localTodayIso } from '@/lib/format';

interface PortalTripListProps {
  token: string;
}

const tripSubtitle = (trip: DriverPortalTripDto, withDate: boolean): string =>
  [
    withDate ? shortDateRange(trip) : null,
    trip.clientName,
    trip.vehicles.map((vehicle) => vehicle.licensePlate).join(', ') || null,
  ]
    .filter(Boolean)
    .join(' · ');

const reportChip = (trip: DriverPortalTripDto): { tone: PortalTone; label: string } | null => {
  if (!trip.report) {
    return null;
  }

  switch (trip.report.status) {
    case 'ACCEPTED':
      return { tone: 'green', label: DRIVER_REPORT_STATUS_LABELS.ACCEPTED };
    case 'RETURNED':
      return { tone: 'red', label: 'Vraćeno na doradu' };
    case 'PARTIALLY_ACCEPTED':
      return { tone: 'amber', label: DRIVER_REPORT_STATUS_LABELS.PARTIALLY_ACCEPTED };
    default:
      return { tone: 'blue', label: DRIVER_REPORT_STATUS_LABELS.SUBMITTED };
  }
};

/** Today's trip, large: where it stands and one button to carry on. */
function TodayCard({
  token,
  trip,
  today,
}: {
  token: string;
  trip: DriverPortalTripDto;
  today: string;
}) {
  const progress = tripDayProgress(trip, today);
  const km = kmProgress(trip.vehicles);
  const expenses = trip.report?.expenses ?? [];
  const advance = advanceBalance(trip.assignment.advanceAmount, expenses);
  const confirmed = Boolean(trip.assignment.confirmedAt);
  const returned = trip.report?.status === 'RETURNED';

  return (
    <Link
      href={portalHref(token, trip.id)}
      className="bg-card border-foreground block rounded-2xl border-[1.5px] p-[18px] shadow-[0_6px_20px_rgba(16,24,40,0.08)]"
    >
      <div className="flex items-center justify-between gap-2">
        {returned ? (
          <PortalChip tone="red" dot>
            Vraćeno na doradu
          </PortalChip>
        ) : !confirmed ? (
          <PortalChip tone="amber" dot>
            Čeka potvrdu
          </PortalChip>
        ) : (
          <PortalChip tone="blue" dot>
            {progress.total > 1 ? `U toku · dan ${progress.day} od ${progress.total}` : 'Danas'}
          </PortalChip>
        )}
        <span className="text-muted-foreground text-[13px]">{shortDateRange(trip)}</span>
      </div>
      <p className="mt-3.5 text-xl font-bold tracking-tight">{portalRouteLabel(trip)}</p>
      <p className="text-muted-foreground mt-0.5 text-[13px]">{tripSubtitle(trip, false)}</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <PortalStat label="Kilometraža" value={km.total > 0 ? `${km.filled} / ${km.total}` : '—'} />
        <PortalStat
          label="Troškovi"
          value={expenses.length === 1 ? '1 unos' : `${expenses.length} unosa`}
        />
        <PortalStat
          label="Akontacija"
          value={advance.received > 0 ? formatPortalAmount(advance.remaining) : '—'}
        />
      </div>
      <span className="bg-primary text-primary-foreground mt-4 flex h-12 items-center justify-center gap-1.5 rounded-xl text-[15px] font-semibold">
        {!confirmed ? 'Pogledaj i potvrdi' : trip.report ? 'Nastavi unos' : 'Unesi podatke'}
        <ArrowRight className="size-4" aria-hidden />
      </span>
    </Link>
  );
}

/** A trip that is not confirmed yet: what it is and a button to open and accept it. */
function ConfirmCard({ token, trip }: { token: string; trip: DriverPortalTripDto }) {
  return (
    <PortalCard className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[13px]">
            {shortDateRange(trip)}
            {trip.departureTime ? ` · postavka ${trip.departureTime}` : ''}
          </p>
          <p className="mt-1 text-[15px] font-semibold">{portalRouteLabel(trip)}</p>
          <p className="text-muted-foreground mt-0.5 text-[13px]">{tripSubtitle(trip, false)}</p>
        </div>
        <PortalChip tone="amber">Čeka potvrdu</PortalChip>
      </div>
      <Link
        href={portalHref(token, trip.id)}
        className="bg-foreground text-background flex h-11 items-center justify-center rounded-xl text-sm font-semibold"
      >
        Pogledaj i prihvati
      </Link>
    </PortalCard>
  );
}

function TripRows({
  token,
  trips,
  chip,
}: {
  token: string;
  trips: DriverPortalTripDto[];
  chip: (trip: DriverPortalTripDto) => { tone: PortalTone; label: string } | null;
}) {
  return (
    <PortalCard className="overflow-hidden">
      {trips.map((trip) => {
        const status = chip(trip);

        return (
          <Link key={trip.id} href={portalHref(token, trip.id)} className="active:bg-accent block">
            <PortalRow
              title={portalRouteLabel(trip)}
              subtitle={tripSubtitle(trip, true)}
              aside={status ? <PortalChip tone={status.tone}>{status.label}</PortalChip> : null}
            />
          </Link>
        );
      })}
    </PortalCard>
  );
}

const PAGE_SIZE = 5;

/** Shows the first five, then "Prikaži više" adds five at a time. */
function ShowMore<T>({
  items,
  children,
}: {
  items: T[];
  children: (visible: T[]) => React.ReactNode;
}) {
  const [count, setCount] = useState(PAGE_SIZE);
  const hidden = items.length - count;

  return (
    <>
      {children(items.slice(0, count))}
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setCount((current) => current + PAGE_SIZE)}
          className="bg-card hover:bg-accent h-11 rounded-xl border text-sm font-semibold"
        >
          Prikaži više ({hidden})
        </button>
      ) : null}
    </>
  );
}

/** Raspored: today, what still has to be sent, the coming days and the last week. */
export function PortalTripList({ token }: PortalTripListProps) {
  const query = usePortalTrips(token);

  if (query.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="space-y-3">
        <PortalMessage title="Vožnje nisu učitane" description={getApiErrorMessage(query.error)} />
        <Button
          type="button"
          className="h-12 w-full"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          {query.isFetching ? 'Učitavanje…' : 'Pokušaj ponovo'}
        </Button>
      </div>
    );
  }

  const { today, pending, submitted, upcoming } = query.data;
  const todayIso = localTodayIso();

  if (today.length + pending.length + submitted.length + upcoming.length === 0) {
    return (
      <PortalMessage
        title="Nemate vožnji"
        description="U poslednjih i narednih 7 dana nemate dodeljenih vožnji."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {today.length > 0 ? (
        <section className="flex flex-col gap-2.5">
          <PortalSectionLabel>Danas</PortalSectionLabel>
          {today.map((trip) => (
            <TodayCard key={trip.id} token={token} trip={trip} today={todayIso} />
          ))}
        </section>
      ) : null}

      {pending.length > 0 ? (
        <section className="flex flex-col gap-2.5">
          <PortalSectionLabel>Čeka unos</PortalSectionLabel>
          <ShowMore items={pending}>
            {(visible) => (
              <TripRows
                token={token}
                trips={visible}
                chip={(trip) => reportChip(trip) ?? { tone: 'amber', label: 'Niste poslali' }}
              />
            )}
          </ShowMore>
        </section>
      ) : null}

      {upcoming.length > 0 ? (
        <section className="flex flex-col gap-2.5">
          <PortalSectionLabel>Naredne vožnje</PortalSectionLabel>
          <ShowMore items={upcoming}>
            {(visible) => {
              // Of the next trips in date order, the unconfirmed ones come first as cards.
              const toConfirm = visible.filter((trip) => !trip.assignment.confirmedAt);
              const confirmed = visible.filter((trip) => trip.assignment.confirmedAt);

              return (
                <>
                  {toConfirm.map((trip) => (
                    <ConfirmCard key={trip.id} token={token} trip={trip} />
                  ))}
                  {confirmed.length > 0 ? (
                    <TripRows
                      token={token}
                      trips={confirmed}
                      chip={() => ({ tone: 'neutral', label: 'Prihvaćeno' })}
                    />
                  ) : null}
                </>
              );
            }}
          </ShowMore>
        </section>
      ) : null}

      {submitted.length > 0 ? (
        <section className="flex flex-col gap-2.5">
          <PortalSectionLabel>Prethodne vožnje</PortalSectionLabel>
          <ShowMore items={submitted}>
            {(visible) => <TripRows token={token} trips={visible} chip={reportChip} />}
          </ShowMore>
        </section>
      ) : null}
    </div>
  );
}
