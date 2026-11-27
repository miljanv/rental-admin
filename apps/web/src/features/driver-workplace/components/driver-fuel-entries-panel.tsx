'use client';

import {
  DRIVER_FUEL_ENTRY_STATUS_LABELS,
  DRIVER_FUEL_ENTRY_STATUSES,
  FUEL_LOG_FUEL_TYPE_LABELS,
  TRIP_EXPENSE_PAYMENT_METHOD_LABELS,
  type DriverFuelEntryDto,
  type DriverFuelEntryStatus,
} from '@rental-admin/shared';
import { Eye, Fuel } from 'lucide-react';
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
  useDriverFuelEntries,
  useReviewDriverFuelEntry,
} from '@/features/driver-workplace/hooks/use-driver-workplace';
import { formatDateTimeSr, formatKilometers, formatMoney } from '@/lib/format';

const ALL = 'all';

const statusVariant = (status: DriverFuelEntryStatus) =>
  status === 'PENDING'
    ? ('default' as const)
    : status === 'REJECTED'
      ? ('destructive' as const)
      : ('secondary' as const);

function FuelEntryCard({ entry }: { entry: DriverFuelEntryDto }) {
  const mutation = useReviewDriverFuelEntry();
  const preview = usePreviewDocumentScan();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const payment =
    entry.paymentMethod === 'CASH'
      ? TRIP_EXPENSE_PAYMENT_METHOD_LABELS.CASH
      : (entry.paymentCard?.name ?? TRIP_EXPENSE_PAYMENT_METHOD_LABELS.COMPANY_CARD);

  return (
    <Card className="shadow-none">
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium">
              {entry.vehicle.licensePlate}{' '}
              <span className="text-muted-foreground text-sm font-normal">
                · {entry.driver.name}
              </span>
            </p>
            <p className="text-muted-foreground text-xs">
              {formatDateTimeSr(entry.fueledAt)} · {formatKilometers(entry.odometerKm)}
            </p>
          </div>
          <Badge variant={statusVariant(entry.status)}>
            {DRIVER_FUEL_ENTRY_STATUS_LABELS[entry.status]}
          </Badge>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground text-xs">Gorivo</dt>
            <dd className="font-medium">
              {entry.liters.toLocaleString('sr-Latn')} l {FUEL_LOG_FUEL_TYPE_LABELS[entry.fuelType]}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Iznos</dt>
            <dd className="font-medium">{formatMoney(entry.amount)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Plaćeno</dt>
            <dd className="font-medium">{payment}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Napomena</dt>
            <dd className="font-medium">{entry.note ?? '—'}</dd>
          </div>
        </dl>

        {entry.status === 'REJECTED' && entry.rejectionReason ? (
          <p className="text-destructive text-sm">Razlog odbijanja: {entry.rejectionReason}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          {entry.file ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={preview.isPending}
              onClick={() => {
                if (entry.file) {
                  preview.mutate({
                    fileId: entry.file.id,
                    tab: window.open('about:blank', '_blank'),
                  });
                }
              }}
            >
              <Eye className="size-4" aria-hidden />
              Račun
            </Button>
          ) : (
            <span className="text-muted-foreground text-xs">Bez računa</span>
          )}
          <span className="flex-1" />
          {entry.status === 'PENDING' && !rejecting ? (
            <>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={mutation.isPending}
                onClick={() => setRejecting(true)}
              >
                Odbij
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate({
                    id: entry.id,
                    input: { action: 'ACCEPT', rejectionReason: null },
                  })
                }
              >
                Prihvati u evidenciju goriva
              </Button>
            </>
          ) : null}
        </div>

        {rejecting ? (
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor={`reject-${entry.id}`}>Zašto odbijate (vozač vidi razlog)</Label>
              <Input
                id={`reject-${entry.id}`}
                value={reason}
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
            <Button type="button" variant="outline" onClick={() => setRejecting(false)}>
              Odustani
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={reason.trim().length === 0 || mutation.isPending}
              onClick={() =>
                mutation.mutate({
                  id: entry.id,
                  input: { action: 'REJECT', rejectionReason: reason.trim() },
                })
              }
            >
              Odbij unos
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Diesel drivers filled outside a trip. Accepting writes liters and km into the fuel log; the
 * amount stays on the entry so a card invoice is not booked twice.
 */
export function DriverFuelEntriesPanel() {
  const [status, setStatus] = useState<DriverFuelEntryStatus | typeof ALL>('PENDING');
  const query = useDriverFuelEntries(status === ALL ? undefined : status);

  return (
    <div className="space-y-4">
      <div className="max-w-xs space-y-1.5">
        <Label htmlFor="fuel-entries-status">Status</Label>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as DriverFuelEntryStatus | typeof ALL)}
        >
          <SelectTrigger id="fuel-entries-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Svi</SelectItem>
            {DRIVER_FUEL_ENTRY_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {value === 'PENDING' ? 'Na čekanju' : DRIVER_FUEL_ENTRY_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isError ? (
        <ErrorState
          error={query.error}
          title="Unosi goriva nisu učitani"
          retryLabel="Pokušaj ponovo"
          retryingLabel="Učitavanje…"
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : !query.data ? (
        <TableSkeleton columns={4} rows={3} />
      ) : query.data.length === 0 ? (
        <EmptyState
          icon={Fuel}
          title="Nema slobodnih unosa dizela"
          description="Vozači ih šalju iz portala kada sipaju gorivo van zadužene vožnje."
        />
      ) : (
        <div className="space-y-3">
          {query.data.map((entry) => (
            <FuelEntryCard key={`${entry.id}:${entry.status}`} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
