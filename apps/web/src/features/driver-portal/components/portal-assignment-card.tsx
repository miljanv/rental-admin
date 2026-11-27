'use client';

import { tripPickupAddress, type DriverPortalTripDto } from '@rental-admin/shared';
import { Bus, CircleCheck, MapPin, Phone } from 'lucide-react';

import { PortalCard } from '@/features/driver-portal/components/portal-ui';
import { usePortalAssignment } from '@/features/driver-portal/hooks/use-portal-assignment';
import { advanceBalance, formatPortalAmount } from '@/features/driver-portal/lib/portal';
import { formatDate, formatDateTime } from '@/lib/format';

interface PortalAssignmentCardProps {
  token: string;
  trip: DriverPortalTripDto;
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-0.5 text-[15px] font-semibold wrap-break-word">{value || '—'}</p>
    </div>
  );
}

function Done({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-[13px] font-medium text-green-700 dark:text-green-400">
      <CircleCheck className="size-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-card flex size-9 shrink-0 items-center justify-center rounded-[10px]">
      {children}
    </span>
  );
}

/** "tel:+381631155023" from however the number was typed. */
const telHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, '')}`;

function OrganizerContact({ name, phone }: { name: string | null; phone: string | null }) {
  const label = [name, phone].filter(Boolean).join(' · ');
  const content = (
    <>
      <span className="bg-foreground text-background flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold">
        {(name ?? phone ?? '?').trim().charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-muted-foreground block text-xs">Kontakt organizatora</span>
        <span className="block truncate text-[15px] font-semibold">{label}</span>
      </span>
      {phone ? (
        <span className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-green-100 px-3.5 text-[13px] font-semibold text-green-800 dark:bg-green-500/15 dark:text-green-300">
          <Phone className="size-4" aria-hidden />
          Pozovi
        </span>
      ) : null}
    </>
  );

  return phone ? (
    <a href={telHref(phone)} className="flex items-center gap-3 rounded-xl border p-3">
      {content}
    </a>
  ) : (
    <div className="flex items-center gap-3 rounded-xl border p-3">{content}</div>
  );
}

const mapsHref = (place: string): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;

/** What the office assigned: pickup, vehicle and programme; the driver confirms it here. */
export function PortalAssignmentCard({ token, trip }: PortalAssignmentCardProps) {
  const mutation = usePortalAssignment(token, trip.id);
  const { assignment } = trip;
  const pickupAddress = tripPickupAddress(trip);

  return (
    <PortalCard className="flex flex-col gap-4 p-[18px]">
      <div className="grid grid-cols-2 gap-3.5">
        <Fact label="Datum postavke" value={formatDate(trip.departureDate)} />
        <Fact label="Vreme postavke" value={trip.departureTime} />
      </div>

      {pickupAddress || trip.pickupLocation ? (
        <a
          href={pickupAddress ? mapsHref(pickupAddress) : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-muted/70 flex items-center gap-3 rounded-xl p-3"
        >
          <IconBox>
            <MapPin className="size-[18px]" aria-hidden />
          </IconBox>
          <span className="flex-1">
            <span className="text-muted-foreground block text-xs">Mesto postavke</span>
            <span className="block text-[15px] font-semibold">
              {pickupAddress ?? trip.pickupLocation}
            </span>
            {pickupAddress && trip.pickupLocation ? (
              <span className="text-muted-foreground block text-[13px]">{trip.pickupLocation}</span>
            ) : null}
          </span>
          {pickupAddress ? (
            <span className="text-[13px] font-semibold text-blue-700 dark:text-blue-300">Mapa</span>
          ) : null}
        </a>
      ) : null}

      {trip.vehicles.map((vehicle) => (
        <div key={vehicle.id} className="bg-muted/70 flex items-center gap-3 rounded-xl p-3">
          <IconBox>
            <Bus className="size-[18px]" aria-hidden />
          </IconBox>
          <span className="flex-1">
            <span className="text-muted-foreground block text-xs">Vozilo</span>
            <span className="block text-[15px] font-semibold">
              {vehicle.licensePlate} · {vehicle.make} {vehicle.model}
            </span>
          </span>
        </div>
      ))}

      {trip.itinerary ? (
        <div>
          <p className="text-muted-foreground mb-2 text-xs">Program putovanja</p>
          <p className="rounded-xl border border-dashed p-3.5 text-sm leading-relaxed whitespace-pre-wrap">
            {trip.itinerary}
          </p>
        </div>
      ) : null}

      {trip.organizerName || trip.organizerPhone ? (
        <OrganizerContact name={trip.organizerName} phone={trip.organizerPhone} />
      ) : null}

      {assignment.confirmedAt ? (
        <Done>Zaduženje potvrđeno {formatDateTime(assignment.confirmedAt)}</Done>
      ) : (
        <button
          type="button"
          className="bg-primary text-primary-foreground h-[52px] rounded-xl text-[15px] font-semibold disabled:opacity-60"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate('confirm')}
        >
          Potvrđujem zaduženje
        </button>
      )}
    </PortalCard>
  );
}

interface PortalAdvanceCardProps {
  token: string;
  trip: DriverPortalTripDto;
  expenses: ReadonlyArray<{ amount: number; paymentMethod: string; status?: string }>;
}

/** The cash advance: how much was handed over, how much went on cash costs, what is left. */
export function PortalAdvanceCard({ token, trip, expenses }: PortalAdvanceCardProps) {
  const mutation = usePortalAssignment(token, trip.id);
  const { assignment } = trip;
  const balance = advanceBalance(assignment.advanceAmount, expenses);

  if (balance.received <= 0) {
    return null;
  }

  const spentShare = Math.min(100, Math.max(0, (balance.cashSpent / balance.received) * 100));

  return (
    <PortalCard className="flex flex-col gap-3 p-[18px]">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-bold">Akontacija</h2>
        <span className="text-muted-foreground text-[13px]">
          primljeno {formatPortalAmount(balance.received)} RSD
        </span>
      </div>
      <div
        className="bg-muted h-2 overflow-hidden rounded-full"
        role="progressbar"
        aria-label="Potrošeno od akontacije"
        aria-valuenow={Math.round(spentShare)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="bg-foreground h-full" style={{ width: `${spentShare}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-muted-foreground text-xs">Potrošeno kešom</p>
          <p className="mt-0.5 text-[15px] font-semibold">
            {formatPortalAmount(balance.cashSpent)} RSD
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Preostalo kod vas</p>
          <p
            className={
              balance.remaining < 0
                ? 'text-destructive mt-0.5 text-[15px] font-semibold'
                : 'mt-0.5 text-[15px] font-semibold text-green-700 dark:text-green-400'
            }
          >
            {formatPortalAmount(balance.remaining)} RSD
          </p>
        </div>
      </div>
      {assignment.advanceAcceptedAt ? (
        <Done>Akontaciju ste prihvatili {formatDateTime(assignment.advanceAcceptedAt)}</Done>
      ) : (
        <button
          type="button"
          className="bg-card hover:bg-accent h-12 rounded-xl border text-[15px] font-semibold disabled:opacity-60"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate('accept-advance')}
        >
          Prihvatam akontaciju kao zaduženje
        </button>
      )}
    </PortalCard>
  );
}
