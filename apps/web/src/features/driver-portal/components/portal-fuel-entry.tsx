'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  DRIVER_FUEL_ENTRY_STATUS_LABELS,
  FUEL_LOG_FUEL_TYPE_LABELS,
  FUEL_LOG_FUEL_TYPES,
  TRIP_EXPENSE_PAYMENT_METHOD_LABELS,
  driverFuelEntryCreateSchema,
  type DriverFuelEntryCreateInput,
  type DriverFuelEntryCreateRequest,
  type DriverFuelEntryStatus,
} from '@rental-admin/shared';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { DateTimeField } from '@/components/common/date-time-field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalMessage } from '@/features/driver-portal/components/portal-shell';
import {
  PortalCard,
  PortalChip,
  PortalChoice,
  PortalFieldLabel,
  PortalRow,
  PortalSectionLabel,
  portalInputClass,
  type PortalTone,
} from '@/features/driver-portal/components/portal-ui';
import {
  PortalVehicleSelect,
  useSuggestedVehicleId,
} from '@/features/driver-portal/components/portal-vehicle-select';
import { ReceiptField } from '@/features/driver-portal/components/receipt-field';
import { usePortalMe } from '@/features/driver-portal/hooks/use-portal-me';
import {
  usePortalFuelEntries,
  useSubmitPortalFuelEntry,
} from '@/features/driver-portal/hooks/use-portal-workplace';
import { formatKm, formatPortalAmount } from '@/features/driver-portal/lib/portal';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatDateTimeSr } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_TONES: Record<DriverFuelEntryStatus, PortalTone> = {
  PENDING: 'blue',
  ACCEPTED: 'green',
  REJECTED: 'red',
};

const pad = (value: number): string => String(value).padStart(2, '0');

/** The phone's current time as "yyyy-mm-ddTHH:mm". */
const nowLocal = (): string => {
  const now = new Date();

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

const emptyEntry = (vehicleId: string): DriverFuelEntryCreateInput => ({
  vehicleId,
  fueledAt: '',
  odometerKm: Number.NaN,
  liters: Number.NaN,
  amount: Number.NaN,
  fuelType: 'DIESEL',
  paymentMethod: 'CASH',
  paymentCardId: '',
  fileId: '',
  note: '',
});

/** Slobodan unos dizela: a fill-up outside an assigned trip, sent to the office for approval. */
export function PortalFuelEntry({ token }: { token: string }) {
  const entries = usePortalFuelEntries(token);
  const mutation = useSubmitPortalFuelEntry(token);
  const suggested = useSuggestedVehicleId(token);
  const paymentCards = usePortalMe(token).data?.paymentCards ?? [];
  const [receiptName, setReceiptName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const form = useForm<DriverFuelEntryCreateInput, unknown, DriverFuelEntryCreateRequest>({
    resolver: zodResolver(driverFuelEntryCreateSchema),
    defaultValues: emptyEntry(''),
  });
  const errors = form.formState.errors;
  const isPending = mutation.isPending;
  const paymentMethod = useWatch({ control: form.control, name: 'paymentMethod' });
  const paymentCardId = useWatch({ control: form.control, name: 'paymentCardId' }) ?? '';
  const paymentOptions = [
    { method: 'CASH' as const, cardId: '', label: TRIP_EXPENSE_PAYMENT_METHOD_LABELS.CASH },
    ...(paymentCards.length > 0
      ? paymentCards.map((card) => ({
          method: 'COMPANY_CARD' as const,
          cardId: card.id,
          label: card.name,
        }))
      : [
          {
            method: 'COMPANY_CARD' as const,
            cardId: '',
            label: TRIP_EXPENSE_PAYMENT_METHOD_LABELS.COMPANY_CARD,
          },
        ]),
  ];

  useEffect(() => {
    if (!form.getValues('fueledAt')) {
      form.setValue('fueledAt', nowLocal());
    }

    if (suggested && !form.getValues('vehicleId')) {
      form.setValue('vehicleId', suggested);
    }
  }, [form, suggested]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values);
      form.reset({ ...emptyEntry(values.vehicleId), fueledAt: nowLocal() });
      setReceiptName(null);
    } catch {
      // Toast from the mutation.
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onSubmit} noValidate>
        <PortalCard className="border-foreground flex flex-col gap-4 border-[1.5px] p-[18px]">
          <div>
            <h2 className="text-[17px] font-bold">Slobodan unos dizela</h2>
            <p className="text-muted-foreground mt-1 text-[13px]">
              Za sipanje kada niste na zaduženoj vožnji. Kancelarija ga prihvata u evidenciju
              goriva.
            </p>
          </div>

          <Controller
            control={form.control}
            name="vehicleId"
            render={({ field }) => (
              <div>
                <PortalFieldLabel htmlFor="fuel-vehicle">
                  Registarska oznaka vozila
                </PortalFieldLabel>
                <PortalVehicleSelect
                  token={token}
                  id="fuel-vehicle"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isPending}
                  invalid={Boolean(errors.vehicleId)}
                />
                {errors.vehicleId?.message ? (
                  <p className="text-destructive mt-1 text-xs">{errors.vehicleId.message}</p>
                ) : null}
              </div>
            )}
          />

          <Controller
            control={form.control}
            name="fueledAt"
            render={({ field }) => (
              <div>
                <PortalFieldLabel htmlFor="fuel-at">Datum i vreme</PortalFieldLabel>
                <DateTimeField
                  id="fuel-at"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isPending}
                  aria-invalid={Boolean(errors.fueledAt)}
                  className="h-[50px]"
                />
                {errors.fueledAt?.message ? (
                  <p className="text-destructive mt-1 text-xs">{errors.fueledAt.message}</p>
                ) : null}
              </div>
            )}
          />

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <PortalFieldLabel htmlFor="fuel-km">Stanje km</PortalFieldLabel>
              <Input
                id="fuel-km"
                type="number"
                inputMode="numeric"
                disabled={isPending}
                aria-invalid={Boolean(errors.odometerKm)}
                className={cn(portalInputClass, 'px-2.5 font-semibold')}
                {...form.register('odometerKm', { valueAsNumber: true })}
              />
            </div>
            <div>
              <PortalFieldLabel htmlFor="fuel-liters">Litara</PortalFieldLabel>
              <Input
                id="fuel-liters"
                type="number"
                inputMode="decimal"
                step="0.01"
                disabled={isPending}
                aria-invalid={Boolean(errors.liters)}
                className={cn(portalInputClass, 'px-2.5 font-semibold')}
                {...form.register('liters', { valueAsNumber: true })}
              />
            </div>
            <div>
              <PortalFieldLabel htmlFor="fuel-amount">Iznos RSD</PortalFieldLabel>
              <Input
                id="fuel-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                disabled={isPending}
                aria-invalid={Boolean(errors.amount)}
                className={cn(portalInputClass, 'px-2.5 font-semibold')}
                {...form.register('amount', { valueAsNumber: true })}
              />
            </div>
          </div>
          {errors.odometerKm?.message || errors.liters?.message || errors.amount?.message ? (
            <p className="text-destructive -mt-2 text-xs">
              {errors.odometerKm?.message ?? errors.liters?.message ?? errors.amount?.message}
            </p>
          ) : null}

          <Controller
            control={form.control}
            name="fuelType"
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-2">
                {FUEL_LOG_FUEL_TYPES.map((type) => (
                  <PortalChoice
                    key={type}
                    selected={field.value === type}
                    disabled={isPending}
                    onClick={() => field.onChange(type)}
                    className="h-11"
                  >
                    {FUEL_LOG_FUEL_TYPE_LABELS[type]}
                  </PortalChoice>
                ))}
              </div>
            )}
          />

          <div>
            <PortalFieldLabel>Način plaćanja</PortalFieldLabel>
            <div role="radiogroup" aria-label="Način plaćanja" className="grid grid-cols-2 gap-2">
              {paymentOptions.map((option) => (
                <PortalChoice
                  key={`${option.method}:${option.cardId}`}
                  role="radio"
                  selected={
                    paymentMethod === option.method &&
                    (option.method === 'CASH' || paymentCardId === option.cardId)
                  }
                  disabled={isPending}
                  onClick={() => {
                    form.setValue('paymentMethod', option.method);
                    form.setValue('paymentCardId', option.cardId);
                  }}
                  className="h-12"
                >
                  {option.label}
                </PortalChoice>
              ))}
            </div>
          </div>

          <ReceiptField
            token={token}
            id="fuel-receipt"
            fileName={receiptName}
            disabled={isPending}
            onUploaded={(file) => {
              setReceiptName(file.originalName);
              form.setValue('fileId', file.id);
            }}
            onRemove={() => {
              setReceiptName(null);
              form.setValue('fileId', '');
            }}
            onBusyChange={setUploading}
          />

          <div>
            <PortalFieldLabel htmlFor="fuel-note" optional>
              Napomena
            </PortalFieldLabel>
            <Input
              id="fuel-note"
              placeholder="npr. sipano u garaži pre servisa"
              disabled={isPending}
              className={portalInputClass}
              {...form.register('note')}
            />
          </div>

          <button
            type="submit"
            disabled={isPending || uploading}
            className="bg-primary text-primary-foreground h-[52px] rounded-xl text-[15px] font-semibold disabled:opacity-60"
          >
            {isPending ? 'Slanje…' : uploading ? 'Čeka se slika računa…' : 'Pošalji kancelariji'}
          </button>
        </PortalCard>
      </form>

      <section className="flex flex-col gap-2.5">
        <PortalSectionLabel>Moji slobodni unosi dizela</PortalSectionLabel>
        {entries.isPending ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : entries.isError ? (
          <PortalMessage
            title="Unosi nisu učitani"
            description={getApiErrorMessage(entries.error)}
          />
        ) : entries.data.length === 0 ? (
          <p className="text-muted-foreground px-1 text-sm">Još nemate slobodnih unosa.</p>
        ) : (
          <PortalCard className="overflow-hidden">
            {entries.data.map((entry) => (
              <PortalRow
                key={entry.id}
                className="items-start"
                title={`${formatPortalAmount(entry.liters)} l · ${formatPortalAmount(entry.amount)} RSD`}
                subtitle={
                  <>
                    {entry.vehicle.licensePlate} · {formatDateTimeSr(entry.fueledAt)} ·{' '}
                    {formatKm(entry.odometerKm)}
                    {entry.status === 'REJECTED' && entry.rejectionReason ? (
                      <span className="text-destructive mt-1 block">
                        Razlog: {entry.rejectionReason}
                      </span>
                    ) : null}
                  </>
                }
                aside={
                  <PortalChip tone={STATUS_TONES[entry.status]}>
                    {DRIVER_FUEL_ENTRY_STATUS_LABELS[entry.status]}
                  </PortalChip>
                }
              />
            ))}
          </PortalCard>
        )}
      </section>
    </div>
  );
}
