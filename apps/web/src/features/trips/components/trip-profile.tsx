'use client';

import {
  contractRouteLabel,
  PAYMENT_METHOD_LABELS,
  tripClientDisplayName,
  tripRouteLabel,
  type TripDto,
} from '@rental-admin/shared';
import { FileText, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGenerateContractDocument } from '@/features/contract-documents/hooks/use-generate-contract-document';
import { TripBillingDocumentsSection } from '@/features/trip-billing-documents/components/trip-billing-documents-section';
import { DeleteTripDialog } from '@/features/trips/components/delete-trip-dialog';
import { TripSettlementSection } from '@/features/trips/components/trip-settlement-section';
import { TripStatusBadge } from '@/features/trips/components/trip-status-badge';
import { useTrip } from '@/features/trips/hooks/use-trip';
import { formatDate, formatKilometers, formatMoney } from '@/lib/format';

interface TripProfileProps {
  tripId: string;
}

interface DetailItemProps {
  label: string;
  value: string;
}

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="space-y-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm font-medium wrap-break-word">{value}</dd>
    </div>
  );
}

function TripOverview({ trip }: { trip: TripDto }) {
  const generateContractDocument = useGenerateContractDocument(trip.contract?.id ?? '');

  return (
    <div className="space-y-6">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Osnovni podaci</CardTitle>
          <CardDescription>Polazište, odredište, period i država.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="RN broj" value={trip.referenceNumber ?? 'Nije dodeljen'} />
            <DetailItem label="Polazište" value={trip.origin} />
            <DetailItem label="Odredište" value={trip.destination} />
            <DetailItem label="Država" value={trip.country ?? '—'} />
            <DetailItem label="Datum polaska" value={formatDate(trip.departureDate)} />
            <DetailItem label="Datum povratka" value={formatDate(trip.returnDate)} />
            <DetailItem label="Broj putnika" value={trip.passengerCount != null ? String(trip.passengerCount) : '—'} />
            <DetailItem label="Kilometraža" value={trip.distanceKm != null ? formatKilometers(trip.distanceKm) : '—'} />
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Naručilac</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Naručilac" value={tripClientDisplayName(trip) || '—'} />
            <DetailItem
              label="Povezan ugovor"
              value={trip.contract ? contractRouteLabel(trip.contract) : 'Nije povezano'}
            />
          </dl>
          {trip.contract ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/contracts/${trip.contract.id}`}>Pogledaj ugovor</Link>
              </Button>
              <Button
                size="sm"
                onClick={() => generateContractDocument.mutate()}
                disabled={generateContractDocument.isPending}
              >
                <FileText className="size-4" aria-hidden />
                {generateContractDocument.isPending ? 'Generisanje…' : 'Generiši Ugovor o prevozu'}
              </Button>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-muted-foreground text-sm">
                Vožnja nije povezana ni sa jednim ugovorom.
              </p>
              <Button variant="link" size="sm" className="mt-1 h-auto px-0" asChild>
                <Link href={`/trips/${trip.id}/edit`}>Poveži ugovor</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Vozila i vozači</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs">Vozila</p>
            {trip.vehicles.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nema dodeljenih vozila.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {trip.vehicles.map((vehicle) => (
                  <Badge key={vehicle.id} variant="outline">
                    {vehicle.make} {vehicle.model} ({vehicle.licensePlate})
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs">Vozači</p>
            {trip.drivers.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nema dodeljenih vozača.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {trip.drivers.map((driver) => (
                  <Badge key={driver.id} variant="outline">
                    {driver.firstName} {driver.lastName}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Cena i plaćanje</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Cena" value={formatMoney(trip.price)} />
            <DetailItem
              label="Način plaćanja"
              value={trip.paymentMethod ? PAYMENT_METHOD_LABELS[trip.paymentMethod] : '—'}
            />
          </dl>
        </CardContent>
      </Card>

      <TripBillingDocumentsSection tripId={trip.id} />

      {trip.notes ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Napomena</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm wrap-break-word whitespace-pre-wrap">{trip.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      {trip.seriesId ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Deo je ponavljajuće serije</CardTitle>
            <CardDescription>
              Ova vožnja je jedna od instanci serije. Izmene za sve buduće instance ili prekid serije
              rade se sa stranice serije.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/trips/series/${trip.seriesId}`}>Upravljaj serijom</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function TripProfile({ tripId }: TripProfileProps) {
  const query = useTrip(tripId);
  const [tripToDelete, setTripToDelete] = useState<TripDto | null>(null);

  if (query.isPending) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ErrorState
        error={query.error ?? new Error('Vožnja nije pronađena.')}
        title="Vožnja nije učitana"
        retryLabel="Pokušaj ponovo"
        retryingLabel="Učitavanje…"
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  const trip = query.data;

  return (
    <>
      <PageHeader
        title={trip.referenceNumber ?? 'Bez RN broja'}
        description={tripRouteLabel(trip)}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <TripStatusBadge status={trip.status} />
            <Button variant="outline" asChild>
              <Link href={`/trips/${trip.id}/edit`}>
                <Pencil className="size-4" aria-hidden />
                Izmeni
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => setTripToDelete(trip)}>
              <Trash2 className="size-4" aria-hidden />
              Obriši
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <TripOverview trip={trip} />
        <TripSettlementSection tripId={trip.id} />
      </div>

      <DeleteTripDialog
        trip={tripToDelete}
        redirectToList
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setTripToDelete(null);
          }
        }}
      />
    </>
  );
}
