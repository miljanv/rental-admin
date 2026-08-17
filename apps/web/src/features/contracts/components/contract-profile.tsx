'use client';

import {
  computeAdvanceAmount,
  computeRemainderAmount,
  contractClientDisplayName,
  contractRouteLabel,
  isLegalEntityPartnerType,
  PARTNER_TYPE_LABELS,
  type ContractDto,
} from '@rental-admin/shared';
import { Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ContractDocumentsTab } from '@/features/contract-documents/components/contract-documents-tab';
import { ContractStatusControl } from '@/features/contracts/components/contract-status-control';
import { DeleteContractDialog } from '@/features/contracts/components/delete-contract-dialog';
import { useContract } from '@/features/contracts/hooks/use-contract';
import { useDriver } from '@/features/drivers/hooks/use-driver';
import { driverFullName } from '@/features/drivers/lib/driver';
import { PassengerListsTab } from '@/features/passenger-lists/components/passenger-lists-tab';
import { TravelPermitsTab } from '@/features/travel-permits/components/travel-permits-tab';
import { useVehicle } from '@/features/vehicles/hooks/use-vehicle';
import { vehicleLabel } from '@/features/vehicles/lib/vehicle';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const PROFILE_TABS = [
  { id: 'overview', label: 'Osnovni podaci' },
  { id: 'documents', label: 'Dokumenti' },
  { id: 'passengers', label: 'Putnici' },
  { id: 'permits', label: 'Putne dozvole' },
] as const;

type ProfileTabId = (typeof PROFILE_TABS)[number]['id'];

interface ContractProfileProps {
  contractId: string;
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

function ContractOverview({ contract }: { contract: ContractDto }) {
  const vehicleQuery = useVehicle(contract.vehicleId ?? '');
  const driverQuery = useDriver(contract.driverId ?? '');
  const advanceAmount = computeAdvanceAmount(contract.price, contract.advancePercentage);
  const remainderAmount = computeRemainderAmount(contract.price, contract.advancePercentage);
  const clientTypeLabel = PARTNER_TYPE_LABELS[contract.clientType];

  return (
    <div className="space-y-6">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Naručilac posla</CardTitle>
          <CardDescription>Podaci onako kako su bili u trenutku zaključenja ugovora.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Naziv / ime" value={contractClientDisplayName(contract)} />
            <DetailItem label="Tip" value={clientTypeLabel} />
            <DetailItem label="Adresa" value={contract.clientAddress} />
            {isLegalEntityPartnerType(contract.clientType) ? (
              <>
                <DetailItem label="PIB" value={contract.clientPib ?? '—'} />
                <DetailItem label="Matični broj" value={contract.clientRegistrationNumber ?? '—'} />
              </>
            ) : (
              <DetailItem label="JMBG" value={contract.clientPersonalId ?? '—'} />
            )}
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Prevoz</CardTitle>
          <CardDescription>Polazište, odredište, period i resursi.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Polazište" value={contract.origin} />
            <DetailItem label="Odredište" value={contract.destination} />
            <DetailItem label="Datum zaključenja" value={formatDate(contract.conclusionDate)} />
            <DetailItem
              label="Period usluge"
              value={`${formatDate(contract.serviceStartDate)} – ${formatDate(contract.serviceEndDate)}`}
            />
            <DetailItem label="Broj putnika" value={String(contract.passengerCount)} />
            <DetailItem label="Međunarodna ruta" value={contract.isInternational ? 'Da' : 'Ne'} />
            <DetailItem
              label="Vozilo"
              value={vehicleQuery.data ? vehicleLabel(vehicleQuery.data) : 'Nije određeno'}
            />
            <DetailItem
              label="Vozač"
              value={driverQuery.data ? driverFullName(driverQuery.data) : 'Nije određeno'}
            />
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Cena i plaćanje</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Ukupna cena" value={`${contract.price.toLocaleString('sr-RS')} RSD`} />
            <DetailItem
              label={`Avans (${contract.advancePercentage}%)`}
              value={`${advanceAmount.toLocaleString('sr-RS')} RSD`}
            />
            <DetailItem label="Preostali iznos" value={`${remainderAmount.toLocaleString('sr-RS')} RSD`} />
          </dl>
        </CardContent>
      </Card>

      {contract.notes ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Napomene</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm wrap-break-word whitespace-pre-wrap">{contract.notes}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function ContractProfile({ contractId }: ContractProfileProps) {
  const query = useContract(contractId);
  const [activeTab, setActiveTab] = useState<ProfileTabId>('overview');
  const [contractToDelete, setContractToDelete] = useState<ContractDto | null>(null);

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
        error={query.error ?? new Error('Ugovor nije pronađen.')}
        title="Ugovor nije učitan"
        retryLabel="Pokušaj ponovo"
        retryingLabel="Učitavanje…"
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  const contract = query.data;

  return (
    <>
      <PageHeader
        title={contractClientDisplayName(contract)}
        description={contractRouteLabel(contract)}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ContractStatusControl contractId={contract.id} status={contract.status} />
            <Button variant="outline" asChild>
              <Link href={`/contracts/${contract.id}/edit`}>
                <Pencil className="size-4" aria-hidden />
                Izmeni
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => setContractToDelete(contract)}>
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

      {activeTab === 'overview' ? <ContractOverview contract={contract} /> : null}
      {activeTab === 'documents' ? <ContractDocumentsTab contractId={contract.id} /> : null}
      {activeTab === 'passengers' ? (
        <PassengerListsTab contractId={contract.id} isInternational={contract.isInternational} />
      ) : null}
      {activeTab === 'permits' ? (
        <TravelPermitsTab contractId={contract.id} isInternational={contract.isInternational} />
      ) : null}

      <DeleteContractDialog
        contract={contractToDelete}
        redirectToList
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setContractToDelete(null);
          }
        }}
      />
    </>
  );
}
