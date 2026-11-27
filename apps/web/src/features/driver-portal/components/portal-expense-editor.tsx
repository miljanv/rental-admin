'use client';

import {
  DRIVER_EXPENSE_CATEGORIES,
  FUEL_LOG_FUEL_TYPE_LABELS,
  FUEL_LOG_FUEL_TYPES,
  TRIP_EXPENSE_CATEGORY_LABELS,
  type DriverPortalTripDto,
  type DriverReportWriteInput,
  type DriverReportWriteRequest,
} from '@rental-admin/shared';
import { X } from 'lucide-react';
import { Controller, type UseFormReturn, useWatch } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ReceiptField } from '@/features/driver-portal/components/receipt-field';
import {
  PortalCard,
  PortalChoice,
  PortalFieldLabel,
  portalInputClass,
} from '@/features/driver-portal/components/portal-ui';
import { formatKm, formatPortalAmount } from '@/features/driver-portal/lib/portal';
import { cn } from '@/lib/utils';

export interface PortalPaymentOption {
  method: 'CASH' | 'COMPANY_CARD';
  cardId: string;
  label: string;
  hint: string;
}

interface PortalExpenseEditorProps {
  token: string;
  form: UseFormReturn<DriverReportWriteInput, unknown, DriverReportWriteRequest>;
  index: number;
  trip: DriverPortalTripDto;
  paymentOptions: PortalPaymentOption[];
  /** Advance left before this cost; null when the trip has no advance. */
  advanceBefore: number | null;
  fileName: string | null;
  disabled: boolean;
  onUploaded: (file: { id: string; originalName: string }) => void;
  onBusyChange: (busy: boolean) => void;
  onSave: () => void;
  onClose: () => void;
}

const amountOf = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

/** One cost being entered or changed: type, amount, how it was paid and the receipt photo. */
export function PortalExpenseEditor({
  token,
  form,
  index,
  trip,
  paymentOptions,
  advanceBefore,
  fileName,
  disabled,
  onUploaded,
  onBusyChange,
  onSave,
  onClose,
}: PortalExpenseEditorProps) {
  const expense = useWatch({ control: form.control, name: `expenses.${index}` });
  const errors = form.formState.errors.expenses?.[index];
  const isFuel = expense?.category === 'FUEL';
  const isCash = expense?.paymentMethod === 'CASH';
  const amount = amountOf(expense?.amount);
  const selectedCard = paymentOptions.find(
    (option) =>
      option.method === expense?.paymentMethod &&
      (option.method === 'CASH' || option.cardId === (expense?.paymentCardId ?? '')),
  );
  const startKm = trip.vehicles.find((vehicle) => vehicle.id === expense?.vehicleId)?.startKm;
  const pumpKm = amountOf(expense?.fuelOdometerKm);
  const sinceStart =
    isFuel && typeof startKm === 'number' && pumpKm > startKm ? pumpKm - startKm : null;
  const after = advanceBefore !== null && isCash ? advanceBefore - amount : null;

  return (
    <PortalCard className="border-foreground flex flex-col gap-[18px] border-[1.5px] p-[18px]">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">{expense?.id ? 'Izmena troška' : 'Novi trošak'}</h2>
        <button
          type="button"
          aria-label="Zatvori"
          onClick={onClose}
          className="bg-muted flex size-9 items-center justify-center rounded-full"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <Controller
        control={form.control}
        name={`expenses.${index}.category`}
        render={({ field }) => (
          <div>
            <PortalFieldLabel>Vrsta troška</PortalFieldLabel>
            <div className="flex flex-wrap gap-2">
              {DRIVER_EXPENSE_CATEGORIES.map((category) => (
                <PortalChoice
                  key={category}
                  selected={field.value === category}
                  disabled={disabled}
                  onClick={() => field.onChange(category)}
                  className="h-10 rounded-full px-3.5 text-[13px]"
                >
                  {TRIP_EXPENSE_CATEGORY_LABELS[category]}
                </PortalChoice>
              ))}
            </div>
          </div>
        )}
      />

      <div>
        <PortalFieldLabel htmlFor={`amount-${index}`}>Iznos (RSD)</PortalFieldLabel>
        <Input
          id={`amount-${index}`}
          type="number"
          inputMode="decimal"
          step="0.01"
          disabled={disabled}
          aria-invalid={Boolean(errors?.amount)}
          className={cn(portalInputClass, 'h-12 text-lg font-semibold md:text-lg')}
          {...form.register(`expenses.${index}.amount`, { valueAsNumber: true })}
        />
        {errors?.amount?.message ? (
          <p className="text-destructive mt-1 text-xs">{errors.amount.message}</p>
        ) : null}
      </div>

      {isFuel ? (
        <div className="flex flex-col gap-2.5">
          {trip.vehicles.length > 1 ? (
            <Controller
              control={form.control}
              name={`expenses.${index}.vehicleId`}
              render={({ field }) => (
                <div>
                  <PortalFieldLabel htmlFor={`vehicle-${index}`}>Vozilo</PortalFieldLabel>
                  <Select
                    value={typeof field.value === 'string' ? field.value : ''}
                    onValueChange={field.onChange}
                    disabled={disabled}
                  >
                    <SelectTrigger
                      id={`vehicle-${index}`}
                      className={cn(portalInputClass, 'w-full')}
                    >
                      <SelectValue placeholder="Izaberite vozilo" />
                    </SelectTrigger>
                    <SelectContent>
                      {trip.vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.licensePlate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            />
          ) : null}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <PortalFieldLabel htmlFor={`liters-${index}`}>Litara</PortalFieldLabel>
              <Input
                id={`liters-${index}`}
                type="number"
                inputMode="decimal"
                step="0.01"
                disabled={disabled}
                aria-invalid={Boolean(errors?.fuelLiters)}
                className={portalInputClass}
                {...form.register(`expenses.${index}.fuelLiters`, { valueAsNumber: true })}
              />
            </div>
            <div>
              <PortalFieldLabel htmlFor={`pump-km-${index}`}>Km pri sipanju</PortalFieldLabel>
              <Input
                id={`pump-km-${index}`}
                type="number"
                inputMode="numeric"
                disabled={disabled}
                aria-invalid={Boolean(errors?.fuelOdometerKm)}
                className={portalInputClass}
                {...form.register(`expenses.${index}.fuelOdometerKm`, { valueAsNumber: true })}
              />
            </div>
          </div>
          {errors?.fuelLiters?.message || errors?.fuelOdometerKm?.message ? (
            <p className="text-destructive text-xs">
              {errors.fuelLiters?.message ?? errors.fuelOdometerKm?.message}
            </p>
          ) : null}
          {sinceStart !== null ? (
            <p className="bg-muted/70 rounded-[10px] px-3 py-2.5 text-[13px]">
              Pređeno od polaska: {formatKm(sinceStart)}
            </p>
          ) : null}
          <Controller
            control={form.control}
            name={`expenses.${index}.fuelType`}
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-2">
                {FUEL_LOG_FUEL_TYPES.map((type) => (
                  <PortalChoice
                    key={type}
                    selected={field.value === type}
                    disabled={disabled}
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
            <PortalFieldLabel htmlFor={`station-${index}`} optional>
              Pumpa
            </PortalFieldLabel>
            <Input
              id={`station-${index}`}
              placeholder="npr. NIS Petrol Šid"
              disabled={disabled}
              className={portalInputClass}
              {...form.register(`expenses.${index}.fuelStation`)}
            />
          </div>
        </div>
      ) : null}

      <div>
        <PortalFieldLabel>Način plaćanja</PortalFieldLabel>
        <div role="radiogroup" aria-label="Način plaćanja" className="flex flex-col gap-2">
          {paymentOptions.map((option) => {
            const selected = option === selectedCard;

            return (
              <button
                key={`${option.method}:${option.cardId}`}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled}
                onClick={() => {
                  form.setValue(`expenses.${index}.paymentMethod`, option.method, {
                    shouldDirty: true,
                  });
                  form.setValue(`expenses.${index}.paymentCardId`, option.cardId, {
                    shouldDirty: true,
                  });
                }}
                className={cn(
                  'bg-card flex min-h-14 w-full items-center gap-3 rounded-xl px-3.5 py-2 text-left',
                  selected ? 'border-foreground border-2' : 'border',
                )}
              >
                <span
                  className={cn(
                    'bg-card size-5 shrink-0 rounded-full',
                    selected
                      ? 'border-foreground border-[6px]'
                      : 'border-muted-foreground border-2',
                  )}
                  aria-hidden
                />
                <span className="flex-1">
                  <span className="block text-[15px] font-semibold">{option.label}</span>
                  <span className="text-muted-foreground mt-px block text-xs">{option.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {after !== null ? (
        <div className="flex flex-col gap-2.5 rounded-[14px] border border-green-200 bg-green-50 p-3.5 dark:border-green-500/25 dark:bg-green-500/10">
          <p className="text-[13px] font-bold text-green-800 dark:text-green-300">
            Akontacija posle ovog troška
          </p>
          <div className="grid grid-cols-[1fr_auto] gap-y-1.5 text-sm">
            <span>Trenutno kod vas</span>
            <span className="text-right font-semibold">
              {formatPortalAmount(advanceBefore ?? 0)} RSD
            </span>
            <span>Ovaj trošak</span>
            <span className="text-destructive text-right font-semibold">
              − {formatPortalAmount(amount)} RSD
            </span>
          </div>
          <div className="h-px bg-green-200 dark:bg-green-500/25" />
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-green-800 dark:text-green-300">
              Ostaje za naredne troškove
            </span>
            <span
              className={cn(
                'text-xl font-bold',
                after < 0 ? 'text-destructive' : 'text-green-800 dark:text-green-300',
              )}
            >
              {formatPortalAmount(after)} RSD
            </span>
          </div>
        </div>
      ) : null}

      {!isCash && selectedCard ? (
        <p className="rounded-xl bg-blue-50 px-3.5 py-3 text-[13px] text-blue-900 dark:bg-blue-500/10 dark:text-blue-200">
          Trošak se knjiži na {selectedCard.label} i ne umanjuje vašu akontaciju.
        </p>
      ) : null}

      <div>
        <PortalFieldLabel htmlFor={`receipt-${index}`}>
          Račun
          {isFuel ? (
            <span className="text-muted-foreground font-normal"> (obavezno za gorivo)</span>
          ) : null}
        </PortalFieldLabel>
        <ReceiptField
          token={token}
          id={`receipt-${index}`}
          fileName={fileName}
          disabled={disabled}
          onUploaded={(file) => {
            onUploaded(file);
            form.setValue(`expenses.${index}.fileId`, file.id, { shouldDirty: true });
          }}
          onRemove={() => form.setValue(`expenses.${index}.fileId`, '', { shouldDirty: true })}
          onBusyChange={onBusyChange}
        />
      </div>

      <div>
        <PortalFieldLabel htmlFor={`note-${index}`} optional>
          Napomena
        </PortalFieldLabel>
        <Input
          id={`note-${index}`}
          placeholder="npr. NIS Petrol Šid"
          disabled={disabled}
          className={portalInputClass}
          {...form.register(`expenses.${index}.note`)}
        />
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={onSave}
        className="bg-foreground text-background h-12 rounded-xl text-[15px] font-semibold disabled:opacity-60"
      >
        Sačuvaj trošak
      </button>
    </PortalCard>
  );
}
