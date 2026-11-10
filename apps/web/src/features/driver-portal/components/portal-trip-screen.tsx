'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalReportForm } from '@/features/driver-portal/components/portal-report-form';
import { PortalMessage } from '@/features/driver-portal/components/portal-shell';
import { usePortalTrip } from '@/features/driver-portal/hooks/use-portal-trip';
import { portalHref, portalRouteLabel } from '@/features/driver-portal/lib/portal';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatDate } from '@/lib/format';

interface PortalTripScreenProps {
  token: string;
  tripId: string;
}

/** One trip: what it is, what the office said about it, and the form to send. */
export function PortalTripScreen({ token, tripId }: PortalTripScreenProps) {
  const query = usePortalTrip(token, tripId);
  const backLink = (
    <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
      <Link href={portalHref(token)}>
        <ArrowLeft className="size-4" aria-hidden />
        Sve vožnje
      </Link>
    </Button>
  );

  if (query.isPending) {
    return (
      <div className="space-y-3">
        {backLink}
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="space-y-3">
        {backLink}
        <PortalMessage title="Vožnja nije učitana" description={getApiErrorMessage(query.error)} />
      </div>
    );
  }

  const trip = query.data;

  return (
    <div className="space-y-5">
      {backLink}

      <div className="space-y-1">
        <p className="text-muted-foreground text-sm">
          {formatDate(trip.departureDate)}
          {trip.returnDate && trip.returnDate !== trip.departureDate
            ? ` – ${formatDate(trip.returnDate)}`
            : ''}
        </p>
        <h2 className="text-lg font-semibold">{portalRouteLabel(trip)}</h2>
        {trip.clientName ? <p className="text-sm">{trip.clientName}</p> : null}
      </div>

      {trip.report?.status === 'RETURNED' && trip.report.adminComment ? (
        <div className="rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">Kancelarija je vratila unos na doradu</p>
          <p>{trip.report.adminComment}</p>
        </div>
      ) : null}

      {trip.canSubmit ? (
        <PortalReportForm key={trip.report?.updatedAt ?? 'new'} token={token} trip={trip} />
      ) : (
        <PortalMessage
          title="Vožnja još nije počela"
          description="Podaci se unose na dan vožnje ili posle nje."
        />
      )}
    </div>
  );
}
