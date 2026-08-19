'use client';

import {
  DRIVER_DOCUMENT_TYPE_LABELS,
  type DriverDocumentStatusItem,
  type DriverDto,
  type DriverMonthlyActivityDto,
} from '@rental-admin/shared';
import { Clock, FileText, FileWarning, Gauge } from 'lucide-react';
import { useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GenerateAbsenceAttestationForm } from '@/features/absence-attestations/components/generate-absence-attestation-form';
import { useAbsenceAttestations } from '@/features/absence-attestations/hooks/use-absence-attestations';
import { DocumentExpiryBadge } from '@/features/driver-documents/components/document-expiry-badge';
import { GenerateEmploymentContractForm } from '@/features/driver-documents/components/generate-employment-contract-form';
import { GenerateMaForm } from '@/features/driver-documents/components/generate-ma-form';
import { localTodayIso } from '@/features/driver-documents/lib/document';
import { useDriverStatusOverview } from '@/features/drivers/hooks/use-driver-status-overview';
import { formatDate, formatKilometers, formatMonthYear } from '@/lib/format';
import { cn } from '@/lib/utils';

interface DriverStatusOverviewProps {
  driver: DriverDto;
  onNavigateToDocuments: () => void;
}

function ActivityCard({
  label,
  value,
  hint,
  icon: Icon,
  isLoading,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Gauge;
  isLoading: boolean;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="truncate text-3xl font-semibold tracking-tight">{value}</p>
          )}
          <p className="text-muted-foreground text-xs">{hint}</p>
        </div>
        <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Icon className="size-4.5" aria-hidden />
        </span>
      </CardContent>
    </Card>
  );
}

function DocumentStatusCard({
  item,
  todayIso,
  onClick,
}: {
  item: DriverDocumentStatusItem;
  todayIso: string;
  onClick: () => void;
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className="hover:border-primary/50 hover:bg-muted/40 shadow-none cursor-pointer transition-colors"
    >
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">{DRIVER_DOCUMENT_TYPE_LABELS[item.type]}</CardTitle>
        {item.document ? (
          <CardDescription>Br. {item.document.documentNumber}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        {item.document ? (
          <div className="space-y-1.5">
            <DocumentExpiryBadge expiresAt={item.document.expiresAt} todayIso={todayIso} />
            <p className="text-muted-foreground text-xs">
              Izdato {formatDate(item.document.issuedAt)}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Nije unešen. Kliknite da dodate.</p>
        )}
      </CardContent>
    </Card>
  );
}

function QuickDocumentCard({
  title,
  description,
  status,
  actionLabel,
  isOpen,
  onToggle,
}: {
  title: string;
  description: string;
  status: React.ReactNode;
  actionLabel: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className={cn('shadow-none', isOpen && 'ring-primary/50 ring-2')}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {status}
        <Button
          type="button"
          size="sm"
          variant={isOpen ? 'default' : 'outline'}
          onClick={onToggle}
          className="w-full"
        >
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

function activityHint(activity: DriverMonthlyActivityDto | undefined): string {
  if (!activity) {
    return 'Tekući mesec';
  }

  const monthLabel = formatMonthYear(activity.year, activity.month);

  if (activity.fuelLogCount === 0) {
    return `${monthLabel} — nema točenja sa ovim vozačem`;
  }

  return `${monthLabel} · ${activity.fuelLogCount} točenja`;
}

type QuickKind = 'contract' | 'ma' | 'absence';

export function DriverStatusOverview({ driver, onNavigateToDocuments }: DriverStatusOverviewProps) {
  const query = useDriverStatusOverview(driver.id);
  const attestationsQuery = useAbsenceAttestations(driver.id);
  const todayIso = localTodayIso();
  const activity = query.data?.monthlyActivity;
  const documents = query.data?.documents ?? [];
  const [openQuick, setOpenQuick] = useState<QuickKind | null>(null);

  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title="Pregled statusa nije učitan"
        retryLabel="Pokušaj ponovo"
        retryingLabel="Učitavanje…"
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  const contractItem = documents.find((item) => item.type === 'EMPLOYMENT_CONTRACT');
  const maItem = documents.find((item) => item.type === 'MA_FORM');
  const otherDocuments = documents.filter(
    (item) => item.type !== 'EMPLOYMENT_CONTRACT' && item.type !== 'MA_FORM',
  );
  const latestAttestation = [...(attestationsQuery.data ?? [])].sort((a, b) =>
    b.issuedAt.localeCompare(a.issuedAt),
  )[0];

  const toggle = (kind: QuickKind) =>
    setOpenQuick((current) => (current === kind ? null : kind));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <ActivityCard
          label="Kilometri ovog meseca"
          value={formatKilometers(activity?.kmDriven ?? 0)}
          hint={activityHint(activity)}
          icon={Gauge}
          isLoading={query.isPending}
        />
        <ActivityCard
          label="Sati ovog meseca"
          value="—"
          hint="Evidencija sati još nije povezana (tahograf / smene)"
          icon={Clock}
          isLoading={query.isPending}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="text-muted-foreground size-4" aria-hidden />
          <h2 className="text-sm font-medium">Brzo generisanje dokumenata</h2>
        </div>

        {query.isPending || attestationsQuery.isPending ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-40 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <QuickDocumentCard
              title="Ugovor o radu"
              description="Popunjava se podacima zaposlenog."
              status={
                contractItem?.document ? (
                  <div className="space-y-1.5">
                    <p className="text-muted-foreground text-xs">
                      Br. {contractItem.document.documentNumber}
                    </p>
                    <DocumentExpiryBadge
                      expiresAt={contractItem.document.expiresAt}
                      todayIso={todayIso}
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Nije generisan.</p>
                )
              }
              actionLabel={contractItem?.document ? 'Izmeni' : 'Generiši'}
              isOpen={openQuick === 'contract'}
              onToggle={() => toggle('contract')}
            />
            <QuickDocumentCard
              title="Obrazac MA"
              description="Prijava na obavezno socijalno osiguranje."
              status={
                maItem?.document ? (
                  <div className="space-y-1.5">
                    <p className="text-muted-foreground text-xs">
                      Br. {maItem.document.documentNumber}
                    </p>
                    <DocumentExpiryBadge expiresAt={maItem.document.expiresAt} todayIso={todayIso} />
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Nije generisan.</p>
                )
              }
              actionLabel={maItem?.document ? 'Izmeni' : 'Generiši'}
              isOpen={openQuick === 'ma'}
              onToggle={() => toggle('ma')}
            />
            <QuickDocumentCard
              title="Potvrda o odsustvu"
              description="Svaki period se dopunjuje posebno — uvek nova potvrda."
              status={
                latestAttestation ? (
                  <p className="text-muted-foreground text-xs">
                    Poslednja: {formatDate(latestAttestation.issuedAt)}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">Nije generisana.</p>
                )
              }
              actionLabel="Nova potvrda"
              isOpen={openQuick === 'absence'}
              onToggle={() => toggle('absence')}
            />
          </div>
        )}

        {openQuick === 'contract' ? (
          <GenerateEmploymentContractForm
            driver={driver}
            existing={contractItem?.document ?? undefined}
            onSaved={() => setOpenQuick(null)}
          />
        ) : null}
        {openQuick === 'ma' ? (
          <GenerateMaForm
            driver={driver}
            existing={maItem?.document ?? undefined}
            contractSignedAt={
              typeof contractItem?.document?.generationData?.signedAt === 'string'
                ? contractItem.document.generationData.signedAt
                : null
            }
            nextDocumentNumber={query.data?.nextMaDocumentNumber}
            onSaved={() => setOpenQuick(null)}
          />
        ) : null}
        {openQuick === 'absence' ? (
          <GenerateAbsenceAttestationForm driverId={driver.id} onSaved={() => setOpenQuick(null)} />
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileWarning className="text-muted-foreground size-4" aria-hidden />
          <h2 className="text-sm font-medium">Rokovi ostalih dokumenata</h2>
        </div>
        {query.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-28 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {otherDocuments.map((item) => (
              <DocumentStatusCard
                key={item.type}
                item={item}
                todayIso={todayIso}
                onClick={onNavigateToDocuments}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
