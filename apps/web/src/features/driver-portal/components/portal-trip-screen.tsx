'use client';

import type { DriverPortalTripDto } from '@rental-admin/shared';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Skeleton } from '@/components/ui/skeleton';
import {
  PortalAdvanceCard,
  PortalAssignmentCard,
} from '@/features/driver-portal/components/portal-assignment-card';
import {
  PortalReportForm,
  type PortalTripStep,
} from '@/features/driver-portal/components/portal-report-form';
import { PortalMessage } from '@/features/driver-portal/components/portal-shell';
import { PortalChip, type PortalTone } from '@/features/driver-portal/components/portal-ui';
import { usePortalTrip } from '@/features/driver-portal/hooks/use-portal-trip';
import { portalHref, portalRouteLabel, shortDateRange } from '@/features/driver-portal/lib/portal';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatDate, localTodayIso } from '@/lib/format';

interface PortalTripScreenProps {
  token: string;
  tripId: string;
}

const tripStatus = (trip: DriverPortalTripDto): { tone: PortalTone; label: string } => {
  const dates = `${formatDate(trip.departureDate)}${
    trip.returnDate && trip.returnDate !== trip.departureDate
      ? ` – ${formatDate(trip.returnDate)}`
      : ''
  }`;

  if (trip.report?.status === 'RETURNED') {
    return { tone: 'red', label: 'Vraćeno na doradu' };
  }

  if (trip.report?.status === 'ACCEPTED') {
    return { tone: 'green', label: `Prihvaćeno · ${dates}` };
  }

  if (!trip.canSubmit) {
    return { tone: 'neutral', label: dates };
  }

  const today = localTodayIso();
  const running = trip.departureDate <= today && (trip.returnDate ?? trip.departureDate) >= today;

  return running
    ? { tone: 'blue', label: `U toku · ${dates}` }
    : { tone: 'amber', label: `Završeno · ${dates}` };
};

function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-muted-foreground flex h-10 items-center gap-1.5 text-sm font-medium"
    >
      <ChevronLeft className="size-[18px]" aria-hidden />
      {children}
    </Link>
  );
}

/** One trip: assignment and odometer, then costs; the step lives in the address. */
export function PortalTripScreen({ token, tripId }: PortalTripScreenProps) {
  const query = usePortalTrip(token, tripId);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const step: PortalTripStep = searchParams.get('korak') === 'troskovi' ? 'troskovi' : 'voznja';
  const homeHref = portalHref(token);

  const changeStep = (next: PortalTripStep) => {
    if (next === step) {
      return;
    }

    if (next === 'troskovi') {
      router.push(`${pathname}?korak=troskovi`);
    } else {
      router.replace(pathname);
    }

    window.scrollTo({ top: 0 });
  };

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <BackLink href={homeHref}>Moje vožnje</BackLink>
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <BackLink href={homeHref}>Moje vožnje</BackLink>
        <PortalMessage title="Vožnja nije učitana" description={getApiErrorMessage(query.error)} />
      </div>
    );
  }

  const trip = query.data;
  const status = tripStatus(trip);
  const onCosts = step === 'troskovi' && trip.canSubmit;
  const plates = trip.vehicles.map((vehicle) => vehicle.licensePlate).join(', ');

  return (
    <div>
      <header className="bg-card border-b px-4 pt-3.5">
        <div className="flex items-center justify-between">
          {onCosts ? (
            <button
              type="button"
              onClick={() => changeStep('voznja')}
              className="text-muted-foreground flex h-10 items-center gap-1.5 text-sm font-medium"
            >
              <ChevronLeft className="size-[18px]" aria-hidden />
              Kilometraža
            </button>
          ) : (
            <BackLink href={homeHref}>Moje vožnje</BackLink>
          )}
          {trip.canSubmit ? (
            <span className="text-muted-foreground text-xs font-medium">
              Korak {onCosts ? 2 : 1} od 2
            </span>
          ) : null}
        </div>
        <div className="px-1 pt-2 pb-3.5">
          {onCosts ? null : (
            <PortalChip tone={status.tone} className="mb-2.5">
              {status.label}
            </PortalChip>
          )}
          <h1 className="text-2xl font-bold tracking-tight">{portalRouteLabel(trip)}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {onCosts
              ? [shortDateRange(trip), plates].filter(Boolean).join(' · ')
              : (trip.clientName ?? '')}
          </p>
        </div>
      </header>

      <main className="flex flex-col gap-4 py-4">
        {trip.report?.status === 'RETURNED' && trip.report.adminComment ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            <p className="font-semibold">Kancelarija je vratila unos na doradu</p>
            <p className="mt-1">{trip.report.adminComment}</p>
          </div>
        ) : trip.report?.adminComment ? (
          <div className="bg-card rounded-2xl border p-4 text-sm">
            <p className="font-semibold">Komentar kancelarije</p>
            <p className="mt-1">{trip.report.adminComment}</p>
          </div>
        ) : null}

        {trip.canSubmit ? (
          <PortalReportForm
            key={trip.report?.updatedAt ?? 'new'}
            token={token}
            trip={trip}
            step={onCosts ? 'troskovi' : 'voznja'}
            onStepChange={changeStep}
          />
        ) : (
          <>
            <PortalAssignmentCard token={token} trip={trip} />
            <PortalAdvanceCard token={token} trip={trip} expenses={[]} />
            <PortalMessage
              title="Vožnja još nije počela"
              description="Kilometraža i troškovi se unose na dan vožnje ili posle nje."
            />
          </>
        )}
      </main>
    </div>
  );
}
