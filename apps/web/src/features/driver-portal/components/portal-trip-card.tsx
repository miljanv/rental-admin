import { DRIVER_REPORT_STATUS_LABELS, type DriverPortalTripDto } from '@rental-admin/shared';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { portalHref, portalRouteLabel } from '@/features/driver-portal/lib/portal';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface PortalTripCardProps {
  token: string;
  trip: DriverPortalTripDto;
  highlight?: 'warning';
}

const statusVariant = (trip: DriverPortalTripDto) => {
  switch (trip.report?.status) {
    case 'ACCEPTED':
      return 'secondary' as const;
    case 'RETURNED':
      return 'destructive' as const;
    default:
      return 'outline' as const;
  }
};

/** One trip in the driver's list; tapping it opens the form unless the trip is still ahead. */
export function PortalTripCard({ token, trip, highlight }: PortalTripCardProps) {
  const dates =
    trip.returnDate && trip.returnDate !== trip.departureDate
      ? `${formatDate(trip.departureDate)} – ${formatDate(trip.returnDate)}`
      : formatDate(trip.departureDate);
  const plates = trip.vehicles.map((vehicle) => vehicle.licensePlate).join(', ');

  const content = (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border p-4',
        trip.canSubmit && 'active:bg-muted transition-colors',
        highlight === 'warning' && 'border-amber-400 bg-amber-50 dark:bg-amber-950/30',
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-muted-foreground text-xs">{dates}</p>
        <p className="font-semibold">{portalRouteLabel(trip)}</p>
        {trip.clientName ? <p className="text-sm">{trip.clientName}</p> : null}
        {plates ? <p className="text-muted-foreground text-sm">{plates}</p> : null}
        {trip.report ? (
          <Badge variant={statusVariant(trip)}>
            {DRIVER_REPORT_STATUS_LABELS[trip.report.status]}
          </Badge>
        ) : null}
      </div>
      {trip.canSubmit ? (
        <span className="text-primary flex shrink-0 items-center gap-1 text-sm font-medium">
          {trip.report ? 'Izmeni' : 'Unesi podatke'}
          <ChevronRight className="size-4" aria-hidden />
        </span>
      ) : null}
    </div>
  );

  return trip.canSubmit ? (
    <Link href={portalHref(token, trip.id)} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
