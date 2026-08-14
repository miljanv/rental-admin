'use client';

import {
  TACHOGRAPH_TYPE_LABELS,
  VEHICLE_FUEL_TYPE_LABELS,
  VEHICLE_TYPE_LABELS,
  type VehicleDto,
} from '@rental-admin/shared';
import { Clock, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { VehicleInspectionsTab } from '@/features/vehicle-inspections/components/vehicle-inspections-tab';
import { DeleteVehicleDialog } from '@/features/vehicles/components/delete-vehicle-dialog';
import { VehicleStatusBadge } from '@/features/vehicles/components/vehicle-status-badge';
import { useVehicle } from '@/features/vehicles/hooks/use-vehicle';
import { cn } from '@/lib/utils';

const PROFILE_TABS = [
  { id: 'overview', label: 'Osnovni podaci' },
  { id: 'inspections', label: 'Tehnički pregledi' },
  { id: 'tachograph', label: 'Tahograf' },
  { id: 'safety-equipment', label: 'Sigurnosna oprema' },
  { id: 'fuel', label: 'Gorivo i potrošnja' },
  { id: 'maintenance', label: 'Održavanje' },
  { id: 'documents', label: 'Dokumenti' },
  { id: 'deadlines', label: 'Pregled rokova' },
] as const;

type ProfileTabId = (typeof PROFILE_TABS)[number]['id'];

interface VehicleProfileProps {
  vehicleId: string;
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

function ComingSoon({ title }: { title: string }) {
  return (
    <EmptyState
      icon={Clock}
      title={`${title} — uskoro`}
      description="Ovaj modul će biti dodat u narednom koraku. Osnovni podaci vozila su već dostupni."
    />
  );
}

function VehicleOverview({ vehicle }: { vehicle: VehicleDto }) {
  return (
    <div className="space-y-6">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Osnovni podaci</CardTitle>
          <CardDescription>Marka, model i identifikacija vozila.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Marka" value={vehicle.make} />
            <DetailItem label="Model" value={vehicle.model} />
            <DetailItem label="Godište" value={String(vehicle.year)} />
            <DetailItem label="Registarske tablice" value={vehicle.licensePlate} />
            <DetailItem label="VIN" value={vehicle.vin} />
            <DetailItem label="Broj sedišta" value={String(vehicle.seatCount)} />
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Tip i oprema</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Tip vozila" value={VEHICLE_TYPE_LABELS[vehicle.type]} />
            <DetailItem label="Tip goriva" value={VEHICLE_FUEL_TYPE_LABELS[vehicle.fuelType]} />
            <DetailItem
              label="Tip tahografa"
              value={TACHOGRAPH_TYPE_LABELS[vehicle.tachographType]}
            />
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Stanje</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem
              label="Trenutna kilometraža"
              value={`${vehicle.currentMileage.toLocaleString('sr-RS')} km`}
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

export function VehicleProfile({ vehicleId }: VehicleProfileProps) {
  const query = useVehicle(vehicleId);
  const [activeTab, setActiveTab] = useState<ProfileTabId>('overview');
  const [vehicleToDelete, setVehicleToDelete] = useState<VehicleDto | null>(null);

  if (query.isPending) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-full max-w-lg" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ErrorState
        error={query.error ?? new Error('Vozilo nije pronađeno.')}
        title="Profil vozila nije učitan"
        retryLabel="Pokušaj ponovo"
        retryingLabel="Učitavanje…"
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  const vehicle = query.data;

  return (
    <>
      <PageHeader
        title={`${vehicle.make} ${vehicle.model}`}
        description={vehicle.licensePlate}
        actions={
          <div className="flex items-center gap-2">
            <VehicleStatusBadge status={vehicle.status} />
            <Button variant="outline" asChild>
              <Link href={`/vehicles/${vehicle.id}/edit`}>
                <Pencil className="size-4" aria-hidden />
                Izmeni
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => setVehicleToDelete(vehicle)}>
              <Trash2 className="size-4" aria-hidden />
              Obriši
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex gap-1 overflow-x-auto border-b">
        {PROFILE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'shrink-0 border-b-2 px-3 py-2 text-sm transition-colors',
              activeTab === tab.id
                ? 'border-primary text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? <VehicleOverview vehicle={vehicle} /> : null}
      {activeTab === 'inspections' ? <VehicleInspectionsTab vehicleId={vehicle.id} /> : null}
      {activeTab === 'tachograph' ? <ComingSoon title="Tahograf" /> : null}
      {activeTab === 'safety-equipment' ? <ComingSoon title="Sigurnosna oprema" /> : null}
      {activeTab === 'fuel' ? <ComingSoon title="Gorivo i potrošnja" /> : null}
      {activeTab === 'maintenance' ? <ComingSoon title="Održavanje" /> : null}
      {activeTab === 'documents' ? <ComingSoon title="Dokumenti" /> : null}
      {activeTab === 'deadlines' ? <ComingSoon title="Pregled rokova" /> : null}

      <DeleteVehicleDialog
        vehicle={vehicleToDelete}
        redirectToList
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setVehicleToDelete(null);
          }
        }}
      />
    </>
  );
}
