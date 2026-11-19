'use client';

import type { DriverPortalTripDto } from '@rental-admin/shared';
import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { usePortalAssignment } from '@/features/driver-portal/hooks/use-portal-assignment';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';

interface PortalAssignmentCardProps {
  token: string;
  trip: DriverPortalTripDto;
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm font-medium wrap-break-word">{value || '—'}</dd>
    </div>
  );
}

function Done({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
      <CheckCircle2 className="size-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

/** What the office assigned: the driver checks it and confirms, and accepts the advance. */
export function PortalAssignmentCard({ token, trip }: PortalAssignmentCardProps) {
  const mutation = usePortalAssignment(token, trip.id);
  const { assignment } = trip;
  const hasAdvance = (assignment.advanceAmount ?? 0) > 0;
  const plates = trip.vehicles
    .map((vehicle) => `${vehicle.licensePlate} (${vehicle.make} ${vehicle.model})`)
    .join(', ');

  return (
    <section className="space-y-4 rounded-xl border p-4">
      <h3 className="font-semibold">Zaduženje</h3>
      <dl className="grid grid-cols-2 gap-3">
        <Detail label="Datum" value={formatDate(trip.departureDate)} />
        <Detail label="Vreme postavke" value={trip.departureTime} />
        <div className="col-span-2">
          <Detail label="Mesto postavke" value={trip.pickupLocation} />
        </div>
        <div className="col-span-2">
          <Detail label="Vozilo" value={plates} />
        </div>
      </dl>
      {trip.itinerary ? (
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Program putovanja</p>
          <p className="text-sm whitespace-pre-wrap">{trip.itinerary}</p>
        </div>
      ) : null}

      {assignment.confirmedAt ? (
        <Done>Potvrdili ste zaduženje {formatDateTime(assignment.confirmedAt)}.</Done>
      ) : (
        <Button
          type="button"
          className="h-12 w-full text-base"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate('confirm')}
        >
          Potvrđujem zaduženje
        </Button>
      )}

      {hasAdvance ? (
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm">
            Akontacija za troškove puta:{' '}
            <span className="font-semibold">{formatMoney(assignment.advanceAmount)}</span>
          </p>
          {assignment.advanceAcceptedAt ? (
            <Done>Prihvatili ste akontaciju {formatDateTime(assignment.advanceAcceptedAt)}.</Done>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full text-base"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate('accept-advance')}
            >
              Prihvatam akontaciju kao zaduženje
            </Button>
          )}
        </div>
      ) : null}
    </section>
  );
}
