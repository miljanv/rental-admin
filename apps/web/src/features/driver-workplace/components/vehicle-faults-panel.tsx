'use client';

import {
  VEHICLE_FAULT_STATUS_LABELS,
  VEHICLE_FAULT_STATUSES,
  type VehicleFaultDto,
  type VehicleFaultStatus,
} from '@rental-admin/shared';
import { Eye, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { TableSkeleton } from '@/components/common/table-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePreviewDocumentScan } from '@/features/driver-documents/hooks/use-preview-document-scan';
import {
  useUpdateVehicleFault,
  useVehicleFaults,
} from '@/features/driver-workplace/hooks/use-driver-workplace';
import { formatDate, formatDateTime, formatKilometers } from '@/lib/format';

const ALL = 'all';

const statusVariant = (status: VehicleFaultStatus) =>
  status === 'REPORTED'
    ? ('default' as const)
    : status === 'IN_REPAIR'
      ? ('outline' as const)
      : ('secondary' as const);

function FaultCard({ fault }: { fault: VehicleFaultDto }) {
  const mutation = useUpdateVehicleFault();
  const preview = usePreviewDocumentScan();
  const [status, setStatus] = useState<VehicleFaultStatus>(fault.status);
  const [note, setNote] = useState(fault.officeNote ?? '');
  const dirty = status !== fault.status || note.trim() !== (fault.officeNote ?? '');

  return (
    <Card className="shadow-none">
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium">
              <Link
                href={`/vehicles/${fault.vehicle.id}`}
                className="underline-offset-4 hover:underline"
              >
                {fault.vehicle.licensePlate}
              </Link>{' '}
              <span className="text-muted-foreground text-sm font-normal">
                {fault.vehicle.make} {fault.vehicle.model}
              </span>
            </p>
            <p className="text-muted-foreground text-xs">
              {formatDate(fault.reportedAt)} · {formatKilometers(fault.odometerKm)} ·{' '}
              {fault.driver?.name ?? 'Nepoznat vozač'} · poslato {formatDateTime(fault.createdAt)}
            </p>
          </div>
          <Badge variant={statusVariant(fault.status)}>
            {VEHICLE_FAULT_STATUS_LABELS[fault.status]}
          </Badge>
        </div>

        <p className="text-sm whitespace-pre-wrap">{fault.description}</p>

        {fault.file ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={preview.isPending}
            onClick={() => {
              if (fault.file) {
                preview.mutate({
                  fileId: fault.file.id,
                  tab: window.open('about:blank', '_blank'),
                });
              }
            }}
          >
            <Eye className="size-4" aria-hidden />
            Slika kvara
          </Button>
        ) : null}

        <div className="grid gap-3 border-t pt-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor={`fault-status-${fault.id}`}>Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as VehicleFaultStatus)}
            >
              <SelectTrigger id={`fault-status-${fault.id}`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_FAULT_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {VEHICLE_FAULT_STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`fault-note-${fault.id}`}>Napomena za vozača</Label>
            <Input
              id={`fault-note-${fault.id}`}
              value={note}
              maxLength={1000}
              placeholder="npr. Servis zakazan za ponedeljak"
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <Button
            type="button"
            disabled={!dirty || mutation.isPending}
            onClick={() =>
              mutation.mutate({ id: fault.id, input: { status, officeNote: note.trim() || null } })
            }
          >
            Sačuvaj
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Faults drivers reported from the portal; the office moves them to repair and to resolved. */
export function VehicleFaultsPanel() {
  const [status, setStatus] = useState<VehicleFaultStatus | typeof ALL>('REPORTED');
  const query = useVehicleFaults(status === ALL ? undefined : status);

  return (
    <div className="space-y-4">
      <div className="max-w-xs space-y-1.5">
        <Label htmlFor="faults-status">Status</Label>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as VehicleFaultStatus | typeof ALL)}
        >
          <SelectTrigger id="faults-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Svi</SelectItem>
            {VEHICLE_FAULT_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {VEHICLE_FAULT_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isError ? (
        <ErrorState
          error={query.error}
          title="Prijave kvarova nisu učitane"
          retryLabel="Pokušaj ponovo"
          retryingLabel="Učitavanje…"
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : !query.data ? (
        <TableSkeleton columns={4} rows={3} />
      ) : query.data.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Nema prijava kvarova"
          description="Vozači prijavljuju kvarove iz portala, na kartici Kvarovi."
        />
      ) : (
        <div className="space-y-3">
          {query.data.map((fault) => (
            <FaultCard
              key={`${fault.id}:${fault.status}:${fault.officeNote ?? ''}`}
              fault={fault}
            />
          ))}
        </div>
      )}
    </div>
  );
}
