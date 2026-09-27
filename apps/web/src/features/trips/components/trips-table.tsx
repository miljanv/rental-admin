'use client';

import {
  groupTripsByDepartureDate,
  PAYMENT_METHOD_LABELS,
  TRIP_BILLING_STATUS_LABELS,
  tripBillingStatus,
  tripVehicleCountLabel,
  type TripBillingStatus,
  type TripDto,
} from '@rental-admin/shared';
import { MoreHorizontal, Pencil, Repeat, Route, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useState } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { TableSkeleton } from '@/components/common/table-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TripInvoiceSheet } from '@/features/trips/components/trip-invoice-sheet';
import { TripSettlementSheet } from '@/features/trips/components/trip-settlement-sheet';
import { tripClientDisplayName, tripLabel, tripRouteLabel } from '@/features/trips/lib/trip';
import { formatDate, formatMoney, formatWeekdayDate, localTodayIso } from '@/lib/format';
import { cn } from '@/lib/utils';

const COLUMN_COUNT = 13;

const BILLING_STATUS_CLASS: Record<TripBillingStatus, string> = {
  UNINVOICED: 'bg-orange-500 text-white hover:bg-orange-600',
  INVOICED: 'bg-red-600 text-white hover:bg-red-700',
  PAID: 'bg-emerald-600 text-white hover:bg-emerald-700',
};

function TruncatedHint({
  items,
  className,
  mono,
}: {
  items: string[];
  className?: string;
  mono?: boolean;
}) {
  if (items.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const first = items[0];
  const rest = items.slice(1);

  if (!first) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex max-w-full cursor-default items-center gap-1.5 bg-transparent p-0 text-left text-sm font-normal',
            className,
          )}
        >
          <span className={cn('min-w-0 truncate', mono && 'font-mono text-xs')}>{first}</span>
          {rest.length > 0 ? (
            <Badge variant="secondary" className="px-1.5 font-normal tabular-nums">
              +{rest.length}
            </Badge>
          ) : null}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-sm flex-col items-start gap-1 py-2 text-left">
        {items.map((item, index) => (
          <span key={`${item}-${index}`} className={cn('block', mono && 'font-mono')}>
            {item}
          </span>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}

function TruncatedText({ value, className }: { value: string; className?: string }) {
  if (!value) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('block truncate', className)}>{value}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-sm text-left">
        {value}
      </TooltipContent>
    </Tooltip>
  );
}

function tripVehicleItems(trip: TripDto): string[] {
  const plates = trip.vehicles.map((vehicle) => vehicle.licensePlate).filter(Boolean);
  const count = Math.max(trip.vehicleCount, plates.length, 1);

  if (plates.length === 0) {
    return [tripVehicleCountLabel(count)];
  }

  if (count > plates.length) {
    return [...plates, tripVehicleCountLabel(count)];
  }

  return plates;
}

interface TripsTableProps {
  trips: TripDto[];
  isLoading: boolean;
  hasFilters: boolean;
  groupByDay?: boolean;
  onRequestDelete: (trip: TripDto) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}

function TripRow({
  trip,
  onRequestDelete,
  onInvoice,
  onSettle,
}: {
  trip: TripDto;
  onRequestDelete: (trip: TripDto) => void;
  onInvoice: (trip: TripDto) => void;
  onSettle: (trip: TripDto) => void;
}) {
  const billingStatus = tripBillingStatus(trip);

  return (
    <TableRow className="group">
      <TableCell className="sticky left-0 z-10 min-w-48 bg-background group-hover:bg-muted/50">
        <div className="min-w-0">
          <Link
            href={`/trips/${trip.id}`}
            className="hover:text-primary block truncate font-medium"
          >
            {trip.referenceNumber ?? 'Bez RN broja'}
          </Link>
          {trip.seriesId ? (
            <Link
              href={`/trips/series/${trip.seriesId}`}
              className="text-primary block text-xs font-normal"
            >
              Izmeni seriju
            </Link>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
        {formatDate(trip.departureDate)}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
        {formatDate(trip.returnDate ?? trip.departureDate)}
      </TableCell>
      <TableCell className="text-muted-foreground max-w-[120px] min-w-0 text-sm">
        <TruncatedText value={trip.country ?? ''} />
      </TableCell>
      <TableCell className="text-muted-foreground max-w-[200px] min-w-0 text-sm">
        <TruncatedText value={tripRouteLabel(trip)} />
      </TableCell>
      <TableCell className="text-muted-foreground max-w-[160px] min-w-0 text-sm">
        <TruncatedText value={tripClientDisplayName(trip)} />
      </TableCell>
      <TableCell className="text-muted-foreground max-w-[200px] min-w-0 text-sm">
        <TruncatedText value={trip.notes ?? ''} />
      </TableCell>
      <TableCell className="max-w-[180px] min-w-0">
        <TruncatedHint items={tripVehicleItems(trip)} mono />
      </TableCell>
      <TableCell className="text-muted-foreground max-w-[160px] min-w-0">
        <TruncatedHint
          items={trip.drivers.map((driver) => `${driver.firstName} ${driver.lastName}`.trim())}
        />
      </TableCell>
      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
        {trip.paymentMethod ? PAYMENT_METHOD_LABELS[trip.paymentMethod] : '—'}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'h-7',
            billingStatus === 'UNINVOICED' &&
              'border-red-500 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950',
          )}
          onClick={() => onInvoice(trip)}
        >
          {trip.price != null ? formatMoney(trip.price) : 'Fakturiši'}
        </Button>
      </TableCell>
      <TableCell>
        <Button
          type="button"
          size="sm"
          className={cn('h-7 border-transparent', BILLING_STATUS_CLASS[billingStatus])}
          aria-label={`Obračun, ${TRIP_BILLING_STATUS_LABELS[billingStatus]}`}
          onClick={() => onSettle(trip)}
        >
          {TRIP_BILLING_STATUS_LABELS[billingStatus]}
        </Button>
      </TableCell>
      <TableCell className="sticky right-0 z-10 bg-background text-right shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.35)] group-hover:bg-muted/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Akcije za vožnju ${tripLabel(trip)}`}>
              <MoreHorizontal className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem asChild className="gap-2">
              <Link href={`/trips/${trip.id}`}>
                <Route className="size-4" aria-hidden />
                Detalji
              </Link>
            </DropdownMenuItem>
            {trip.seriesId ? (
              <DropdownMenuItem asChild className="gap-2">
                <Link href={`/trips/series/${trip.seriesId}`}>
                  <Repeat className="size-4" aria-hidden />
                  Izmeni celu seriju
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem asChild className="gap-2">
              <Link href={`/trips/${trip.id}/edit`}>
                <Pencil className="size-4" aria-hidden />
                {trip.seriesId ? 'Izmeni ovaj dan' : 'Izmeni'}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onRequestDelete(trip)}
              className="gap-2"
            >
              <Trash2 className="size-4" aria-hidden />
              Obriši
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export function TripsTable({
  trips,
  isLoading,
  hasFilters,
  groupByDay = false,
  onRequestDelete,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: TripsTableProps) {
  const todayIso = localTodayIso();
  const [invoiceTarget, setInvoiceTarget] = useState<TripDto | null>(null);
  const [settlementTarget, setSettlementTarget] = useState<TripDto | null>(null);

  if (!isLoading && trips.length === 0) {
    return (
      <EmptyState
        icon={Route}
        title={emptyTitle ?? (hasFilters ? 'Nema rezultata' : 'Još nema vožnji')}
        description={
          emptyDescription ??
          (hasFilters
            ? 'Nijedna vožnja ne odgovara filterima. Pokušajte sa drugim kriterijumima.'
            : 'Kreirajte prvu vožnju.')
        }
        action={emptyAction}
      />
    );
  }

  const dayGroups = groupByDay ? groupTripsByDepartureDate(trips) : null;

  return (
    <TooltipProvider delayDuration={250}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-20 min-w-48 bg-background">RN broj</TableHead>
            <TableHead>Odlazak</TableHead>
            <TableHead>Zaključni dan</TableHead>
            <TableHead>Država</TableHead>
            <TableHead>Relacija</TableHead>
            <TableHead>Naručilac</TableHead>
            <TableHead>Napomena</TableHead>
            <TableHead>Vozilo</TableHead>
            <TableHead>Vozači</TableHead>
            <TableHead>Način plaćanja</TableHead>
            <TableHead className="text-right">Cena</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="sticky right-0 z-20 w-16 bg-background text-right shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.35)]">
              Akcije
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeleton rows={5} columns={COLUMN_COUNT} />
          ) : dayGroups ? (
            dayGroups.map((group) => (
              <Fragment key={group.date}>
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={COLUMN_COUNT}
                    className={cn(
                      'px-3 py-2 text-sm font-semibold whitespace-normal text-white',
                      group.date === todayIso ? 'bg-emerald-700' : 'bg-emerald-600',
                    )}
                  >
                    {group.date === todayIso ? 'Danas · ' : null}
                    {formatWeekdayDate(group.date)}
                    <span className="ml-2 font-normal opacity-90">
                      {group.trips.length} {group.trips.length === 1 ? 'vožnja' : 'vožnji'}
                    </span>
                  </TableCell>
                </TableRow>
                {group.trips.map((trip) => (
                  <TripRow
                    key={trip.id}
                    trip={trip}
                    onRequestDelete={onRequestDelete}
                    onInvoice={setInvoiceTarget}
                    onSettle={setSettlementTarget}
                  />
                ))}
              </Fragment>
            ))
          ) : (
            trips.map((trip) => (
              <TripRow
                key={trip.id}
                trip={trip}
                onRequestDelete={onRequestDelete}
                onInvoice={setInvoiceTarget}
                onSettle={setSettlementTarget}
              />
            ))
          )}
        </TableBody>
      </Table>
      <TripInvoiceSheet
        trip={invoiceTarget}
        onOpenChange={(open) => {
          if (!open) {
            setInvoiceTarget(null);
          }
        }}
      />
      <TripSettlementSheet
        trip={settlementTarget}
        onOpenChange={(open) => {
          if (!open) {
            setSettlementTarget(null);
          }
        }}
      />
    </TooltipProvider>
  );
}
