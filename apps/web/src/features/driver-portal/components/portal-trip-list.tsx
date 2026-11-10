'use client';

import type { DriverPortalTripDto } from '@rental-admin/shared';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalMessage } from '@/features/driver-portal/components/portal-shell';
import { PortalTripCard } from '@/features/driver-portal/components/portal-trip-card';
import { usePortalTrips } from '@/features/driver-portal/hooks/use-portal-trips';
import { getApiErrorMessage } from '@/lib/api-error';

interface PortalTripListProps {
  token: string;
}

function Section({
  title,
  trips,
  token,
  highlight,
}: {
  title: string;
  trips: DriverPortalTripDto[];
  token: string;
  highlight?: 'warning';
}) {
  if (trips.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {title}
      </h2>
      {trips.map((trip) => (
        <PortalTripCard key={trip.id} token={token} trip={trip} highlight={highlight} />
      ))}
    </section>
  );
}

/** The driver's trips: today, still to report, already sent, and the coming days. */
export function PortalTripList({ token }: PortalTripListProps) {
  const query = usePortalTrips(token);

  if (query.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="space-y-3">
        <PortalMessage title="Vožnje nisu učitane" description={getApiErrorMessage(query.error)} />
        <Button
          type="button"
          className="w-full"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          {query.isFetching ? 'Učitavanje…' : 'Pokušaj ponovo'}
        </Button>
      </div>
    );
  }

  const { today, pending, submitted, upcoming } = query.data;

  if (today.length + pending.length + submitted.length + upcoming.length === 0) {
    return (
      <PortalMessage
        title="Nemate vožnji"
        description="U poslednjih i narednih 7 dana nemate dodeljenih vožnji."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Section title="Danas" trips={today} token={token} />
      <Section title="Čeka unos" trips={pending} token={token} highlight="warning" />
      <Section title="Poslato" trips={submitted} token={token} />
      <Section title="Naredni dani" trips={upcoming} token={token} />
    </div>
  );
}
