'use client';

import { EMPLOYMENT_TYPE_LABELS, type DriverDto } from '@rental-admin/shared';
import { Clock, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AbsenceAttestationsTab } from '@/features/absence-attestations/components/absence-attestations-tab';
import { DriverDocumentsTab } from '@/features/driver-documents/components/driver-documents-tab';
import { DriverWorkTab } from '@/features/driver-work/components/driver-work-tab';
import { DeleteDriverDialog } from '@/features/drivers/components/delete-driver-dialog';
import { DriverStatusBadge } from '@/features/drivers/components/driver-status-badge';
import { DriverStatusOverview } from '@/features/drivers/components/driver-status-overview';
import { useDriver } from '@/features/drivers/hooks/use-driver';
import { driverFullName } from '@/features/drivers/lib/driver';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const PROFILE_TABS = [
  { id: 'overview', label: 'Osnovni podaci' },
  { id: 'documents', label: 'Dokumenti' },
  { id: 'work', label: 'Evidencija rada' },
  { id: 'absences', label: 'Odsustva' },
  { id: 'trainings', label: 'Obuke' },
  { id: 'exams', label: 'Pregledi' },
] as const;

type ProfileTabId = (typeof PROFILE_TABS)[number]['id'];

interface DriverProfileProps {
  driverId: string;
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
      description="Ovaj modul će biti dodat u narednom koraku. Osnovni podaci vozača su već dostupni."
    />
  );
}

function DriverOverview({
  driver,
  onNavigateToDocuments,
}: {
  driver: DriverDto;
  onNavigateToDocuments: () => void;
}) {
  return (
    <div className="space-y-6">
      <DriverStatusOverview driver={driver} onNavigateToDocuments={onNavigateToDocuments} />

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Lični podaci</CardTitle>
          <CardDescription>Identifikacija i prebivalište.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Ime" value={driver.firstName} />
            <DetailItem label="Prezime" value={driver.lastName} />
            <DetailItem label="JMBG" value={driver.jmbg} />
            <DetailItem label="Datum rođenja" value={formatDate(driver.dateOfBirth)} />
            <DetailItem label="Mesto prebivališta" value={driver.residencePlace} />
            <DetailItem label="Adresa" value={driver.residenceAddress ?? '—'} />
            <DetailItem label="Stručna sprema" value={driver.educationLevel} />
            <DetailItem label="Broj lične karte" value={driver.idCardNumber} />
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Vozačka dozvola i licenca</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Broj vozačke dozvole" value={driver.drivingLicenseNumber} />
            <DetailItem label="Kategorija" value={driver.drivingLicenseCategory} />
            <DetailItem label="Broj licence" value={driver.licenseNumber} />
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Kontakt i radni status</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Telefon" value={driver.phone} />
            <DetailItem label="Email" value={driver.email ?? '—'} />
            <DetailItem label="Radno mesto" value={driver.jobTitle} />
            <DetailItem label="Tip zaposlenja" value={EMPLOYMENT_TYPE_LABELS[driver.employmentType]} />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

export function DriverProfile({ driverId }: DriverProfileProps) {
  const query = useDriver(driverId);
  const [activeTab, setActiveTab] = useState<ProfileTabId>('overview');
  const [driverToDelete, setDriverToDelete] = useState<DriverDto | null>(null);

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
        error={query.error ?? new Error('Vozač nije pronađen.')}
        title="Profil vozača nije učitan"
        retryLabel="Pokušaj ponovo"
        retryingLabel="Učitavanje…"
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  const driver = query.data;

  return (
    <>
      <PageHeader
        title={driverFullName(driver)}
        description={driver.jobTitle}
        actions={
          <div className="flex items-center gap-2">
            <DriverStatusBadge status={driver.status} />
            <Button variant="outline" asChild>
              <Link href={`/drivers/${driver.id}/edit`}>
                <Pencil className="size-4" aria-hidden />
                Izmeni
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => setDriverToDelete(driver)}>
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

      {activeTab === 'overview' ? (
        <DriverOverview driver={driver} onNavigateToDocuments={() => setActiveTab('documents')} />
      ) : null}
      {activeTab === 'documents' ? <DriverDocumentsTab driver={driver} /> : null}
      {activeTab === 'work' ? <DriverWorkTab driverId={driver.id} /> : null}
      {activeTab === 'absences' ? <AbsenceAttestationsTab driver={driver} /> : null}
      {activeTab === 'trainings' ? <ComingSoon title="Obuke" /> : null}
      {activeTab === 'exams' ? <ComingSoon title="Pregledi" /> : null}

      <DeleteDriverDialog
        driver={driverToDelete}
        redirectToList
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDriverToDelete(null);
          }
        }}
      />
    </>
  );
}
