'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  DRIVER_EXPENSE_CATEGORIES,
  FUEL_LOG_FUEL_TYPE_LABELS,
  FUEL_LOG_FUEL_TYPES,
  DRIVER_EXPENSE_PAYMENT_METHODS,
  DRIVER_REPORT_EXPENSE_STATUS_LABELS,
  TRIP_EXPENSE_CATEGORY_LABELS,
  TRIP_EXPENSE_PAYMENT_METHOD_LABELS,
  driverReportWriteSchema,
  tripVehicleDistanceKm,
  type DriverPortalTripDto,
  type DriverReportWriteInput,
  type DriverReportWriteRequest,
} from '@rental-admin/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';

import { DateTimeField } from '@/components/common/date-time-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ReceiptField } from '@/features/driver-portal/components/receipt-field';
import { usePortalMe } from '@/features/driver-portal/hooks/use-portal-me';
import { useSubmitPortalReport } from '@/features/driver-portal/hooks/use-submit-portal-report';
import { formatKm, portalHref } from '@/features/driver-portal/lib/portal';
import { formatMoney } from '@/lib/format';

interface PortalReportFormProps {
  token: string;
  trip: DriverPortalTripDto;
}

const toReading = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/** Only expenses still waiting for the office are editable; handled ones are shown apart. */
const formValues = (trip: DriverPortalTripDto): DriverReportWriteInput => ({
  vehicles: trip.vehicles.map((vehicle) => ({
    vehicleId: vehicle.id,
    garageStartKm: vehicle.garageStartKm ?? '',
    startKm: vehicle.startKm ?? '',
    endKm: vehicle.endKm ?? '',
    garageEndKm: vehicle.garageEndKm ?? '',
  })),
  startedAt: trip.report?.startedAt ?? '',
  finishedAt: trip.report?.finishedAt ?? '',
  borderCrossings: trip.report?.borderCrossings ?? [],
  expenses: (trip.report?.expenses ?? [])
    .filter((expense) => expense.status === 'PENDING')
    .map((expense) => ({
      id: expense.id,
      category: expense.category,
      amount: expense.amount,
      paymentMethod: expense.paymentMethod === 'COMPANY_CARD' ? 'COMPANY_CARD' : 'CASH',
      paymentCardId: expense.paymentCardId ?? '',
      note: expense.note ?? '',
      fileId: expense.file?.id ?? '',
      vehicleId: expense.vehicleId ?? trip.vehicles[0]?.id ?? '',
      fuelLiters: expense.fuelLiters ?? '',
      fuelType: expense.fuelType ?? 'DIESEL',
      fuelOdometerKm: expense.fuelOdometerKm ?? '',
      fuelStation: expense.fuelStation ?? '',
    })),
  note: trip.report?.note ?? '',
});

type ExpenseInput = NonNullable<DriverReportWriteInput['expenses']>[number];

type KmField = 'garageStartKm' | 'startKm' | 'endKm' | 'garageEndKm';

/** The vehicle's day in order, as on the paper travel order. */
const KM_FIELDS: ReadonlyArray<{ field: KmField; label: string }> = [
  { field: 'garageStartKm', label: 'Početna km iz garaže' },
  { field: 'startKm', label: 'Početna km sa polaska (putnici)' },
  { field: 'endKm', label: 'Završna km gde ostavljate putnike' },
  { field: 'garageEndKm', label: 'Završna km u garaži' },
];

const DIRECTION_LABELS = { OUT: 'Izlazak iz Srbije', IN: 'Ulazak u Srbiju' } as const;

const newExpense = (trip: DriverPortalTripDto): ExpenseInput => ({
  id: '',
  category: 'TOLL',
  amount: Number.NaN,
  paymentMethod: 'CASH',
  paymentCardId: '',
  note: '',
  fileId: '',
  vehicleId: trip.vehicles[0]?.id ?? '',
  fuelLiters: '',
  fuelType: 'DIESEL',
  fuelOdometerKm: '',
  fuelStation: '',
});

/** Odometer per vehicle and expenses with receipt photos for one trip. */
export function PortalReportForm({ token, trip }: PortalReportFormProps) {
  const router = useRouter();
  const mutation = useSubmitPortalReport(token, trip.id);
  const form = useForm<DriverReportWriteInput, unknown, DriverReportWriteRequest>({
    resolver: zodResolver(driverReportWriteSchema),
    defaultValues: formValues(trip),
  });
  const expenseFields = useFieldArray({ control: form.control, name: 'expenses' });
  const borderFields = useFieldArray({ control: form.control, name: 'borderCrossings' });
  const paymentCards = usePortalMe(token).data?.paymentCards ?? [];
  // Cash plus each company card ("OMV kartica"); without cards, one plain company card button.
  const paymentOptions =
    paymentCards.length > 0
      ? [
          { method: 'CASH' as const, cardId: '', label: TRIP_EXPENSE_PAYMENT_METHOD_LABELS.CASH },
          ...paymentCards.map((card) => ({
            method: 'COMPANY_CARD' as const,
            cardId: card.id,
            label: card.name,
          })),
        ]
      : DRIVER_EXPENSE_PAYMENT_METHODS.map((method) => ({
          method,
          cardId: '',
          label: TRIP_EXPENSE_PAYMENT_METHOD_LABELS[method],
        }));
  const vehicles = useWatch({ control: form.control, name: 'vehicles' }) ?? [];
  const watchedExpenses = useWatch({ control: form.control, name: 'expenses' }) ?? [];
  const [fileNames, setFileNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (trip.report?.expenses ?? []).flatMap((expense) =>
        expense.file ? [[expense.file.id, expense.file.originalName]] : [],
      ),
    ),
  );
  const [busyUploads, setBusyUploads] = useState<Record<string, boolean>>({});
  const isUploading = Object.values(busyUploads).some(Boolean);
  const handledExpenses = (trip.report?.expenses ?? []).filter(
    (expense) => expense.status !== 'PENDING',
  );
  const errors = form.formState.errors;
  const isPending = mutation.isPending;

  const setBusy = useCallback((key: string, busy: boolean) => {
    setBusyUploads((current) => (current[key] === busy ? current : { ...current, [key]: busy }));
  }, []);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values);
      router.push(portalHref(token));
    } catch {
      // The mutation reports the failure as a toast.
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6 pb-8">
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Kilometraža</h2>
        {trip.vehicles.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Vožnji još nije dodeljeno vozilo. Javite se kancelariji.
          </p>
        ) : (
          trip.vehicles.map((vehicle, index) => {
            const reading = vehicles[index];
            const distance = tripVehicleDistanceKm(
              toReading(reading?.startKm),
              toReading(reading?.endKm),
            );
            const garageDistance = tripVehicleDistanceKm(
              toReading(reading?.garageStartKm),
              toReading(reading?.garageEndKm),
            );
            const rowErrors = errors.vehicles?.[index];

            return (
              <div key={vehicle.id} className="space-y-3 rounded-xl border p-4">
                <p className="font-medium">
                  {vehicle.licensePlate}{' '}
                  <span className="text-muted-foreground text-sm font-normal">
                    {vehicle.make} {vehicle.model}
                  </span>
                </p>
                {KM_FIELDS.map(({ field, label }) => (
                  <div key={field} className="space-y-1.5">
                    <Label htmlFor={`${field}-${vehicle.id}`}>{label}</Label>
                    <Input
                      id={`${field}-${vehicle.id}`}
                      type="number"
                      inputMode="numeric"
                      className="h-11 text-base"
                      disabled={isPending}
                      aria-invalid={Boolean(rowErrors?.[field])}
                      {...form.register(`vehicles.${index}.${field}`, { valueAsNumber: true })}
                    />
                    {field === 'garageStartKm' && vehicle.lastKnownKm !== null ? (
                      <p className="text-muted-foreground text-xs">
                        Poslednje poznato: {formatKm(vehicle.lastKnownKm)}
                      </p>
                    ) : null}
                    {rowErrors?.[field]?.message ? (
                      <p className="text-destructive text-xs">{rowErrors[field]?.message}</p>
                    ) : null}
                  </div>
                ))}
                {distance !== null || garageDistance !== null ? (
                  <p className="text-sm font-medium">
                    {distance !== null ? `Sa putnicima: ${formatKm(distance)}` : ''}
                    {distance !== null && garageDistance !== null ? ' · ' : ''}
                    {garageDistance !== null ? `Ukupno: ${formatKm(garageDistance)}` : ''}
                  </p>
                ) : null}
              </div>
            );
          })
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Troškovi</h2>

        {handledExpenses.map((expense) => (
          <div key={expense.id} className="bg-muted/40 space-y-1 rounded-xl border p-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{TRIP_EXPENSE_CATEGORY_LABELS[expense.category]}</span>
              <span className="font-medium">{formatMoney(expense.amount)}</span>
            </div>
            <Badge variant={expense.status === 'ACCEPTED' ? 'secondary' : 'destructive'}>
              {DRIVER_REPORT_EXPENSE_STATUS_LABELS[expense.status]}
            </Badge>
            {expense.status === 'REJECTED' && expense.rejectionReason ? (
              <p className="text-destructive">Razlog: {expense.rejectionReason}</p>
            ) : null}
          </div>
        ))}

        {expenseFields.fields.map((field, index) => {
          const rowErrors = errors.expenses?.[index];
          const isFuel = watchedExpenses[index]?.category === 'FUEL';
          const fileId = watchedExpenses[index]?.fileId;

          return (
            <div key={field.id} className="space-y-3 rounded-xl border p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Trošak {index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Ukloni trošak"
                  disabled={isPending}
                  onClick={() => expenseFields.remove(index)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>

              <Controller
                control={form.control}
                name={`expenses.${index}.category`}
                render={({ field: categoryField }) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={`category-${field.id}`}>Vrsta troška</Label>
                    <Select
                      value={categoryField.value}
                      onValueChange={categoryField.onChange}
                      disabled={isPending}
                    >
                      <SelectTrigger id={`category-${field.id}`} className="h-11 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DRIVER_EXPENSE_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {TRIP_EXPENSE_CATEGORY_LABELS[category]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />

              <div className="space-y-1.5">
                <Label htmlFor={`amount-${field.id}`}>Iznos (RSD)</Label>
                <Input
                  id={`amount-${field.id}`}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  className="h-11 text-base"
                  disabled={isPending}
                  aria-invalid={Boolean(rowErrors?.amount)}
                  {...form.register(`expenses.${index}.amount`, { valueAsNumber: true })}
                />
                {rowErrors?.amount?.message ? (
                  <p className="text-destructive text-xs">{rowErrors.amount.message}</p>
                ) : null}
              </div>

              <Controller
                control={form.control}
                name={`expenses.${index}.paymentMethod`}
                render={({ field: paymentField }) => (
                  <div className="space-y-1.5">
                    <Label>Čime ste platili</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {paymentOptions.map((option) => {
                        const selected =
                          paymentField.value === option.method &&
                          (option.method === 'CASH' ||
                            paymentCards.length === 0 ||
                            (watchedExpenses[index]?.paymentCardId ?? '') === option.cardId);

                        return (
                          <Button
                            key={`${option.method}:${option.cardId}`}
                            type="button"
                            className="h-11"
                            variant={selected ? 'default' : 'outline'}
                            disabled={isPending}
                            onClick={() => {
                              paymentField.onChange(option.method);
                              form.setValue(`expenses.${index}.paymentCardId`, option.cardId, {
                                shouldDirty: true,
                              });
                            }}
                          >
                            {option.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
              />

              {isFuel ? (
                <div className="bg-muted/40 space-y-3 rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">
                    Podaci o točenju (opciono) — kancelarija ih upisuje u evidenciju goriva.
                  </p>
                  {trip.vehicles.length > 1 ? (
                    <Controller
                      control={form.control}
                      name={`expenses.${index}.vehicleId`}
                      render={({ field: vehicleField }) => (
                        <div className="space-y-1.5">
                          <Label htmlFor={`vehicle-${field.id}`}>Vozilo</Label>
                          <Select
                            value={typeof vehicleField.value === 'string' ? vehicleField.value : ''}
                            onValueChange={vehicleField.onChange}
                            disabled={isPending}
                          >
                            <SelectTrigger id={`vehicle-${field.id}`} className="h-11 w-full">
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
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`liters-${field.id}`}>Litara</Label>
                      <Input
                        id={`liters-${field.id}`}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        className="h-11 text-base"
                        disabled={isPending}
                        aria-invalid={Boolean(rowErrors?.fuelLiters)}
                        {...form.register(`expenses.${index}.fuelLiters`, { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`pump-km-${field.id}`}>Km na pumpi</Label>
                      <Input
                        id={`pump-km-${field.id}`}
                        type="number"
                        inputMode="numeric"
                        className="h-11 text-base"
                        disabled={isPending}
                        aria-invalid={Boolean(rowErrors?.fuelOdometerKm)}
                        {...form.register(`expenses.${index}.fuelOdometerKm`, {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                  </div>
                  {rowErrors?.fuelLiters?.message || rowErrors?.fuelOdometerKm?.message ? (
                    <p className="text-destructive text-xs">
                      {rowErrors.fuelLiters?.message ?? rowErrors.fuelOdometerKm?.message}
                    </p>
                  ) : null}
                  <Controller
                    control={form.control}
                    name={`expenses.${index}.fuelType`}
                    render={({ field: typeField }) => (
                      <div className="grid grid-cols-2 gap-2">
                        {FUEL_LOG_FUEL_TYPES.map((type) => (
                          <Button
                            key={type}
                            type="button"
                            className="h-11"
                            variant={typeField.value === type ? 'default' : 'outline'}
                            disabled={isPending}
                            onClick={() => typeField.onChange(type)}
                          >
                            {FUEL_LOG_FUEL_TYPE_LABELS[type]}
                          </Button>
                        ))}
                      </div>
                    )}
                  />
                  <div className="space-y-1.5">
                    <Label htmlFor={`station-${field.id}`}>Pumpa</Label>
                    <Input
                      id={`station-${field.id}`}
                      placeholder="npr. NIS Čoka"
                      disabled={isPending}
                      {...form.register(`expenses.${index}.fuelStation`)}
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor={`receipt-${field.id}`}>Račun</Label>
                <ReceiptField
                  token={token}
                  id={`receipt-${field.id}`}
                  fileName={fileId ? (fileNames[fileId] ?? 'Račun priložen') : null}
                  disabled={isPending}
                  onUploaded={(file) => {
                    setFileNames((current) => ({ ...current, [file.id]: file.originalName }));
                    form.setValue(`expenses.${index}.fileId`, file.id, { shouldDirty: true });
                  }}
                  onRemove={() =>
                    form.setValue(`expenses.${index}.fileId`, '', { shouldDirty: true })
                  }
                  onBusyChange={(busy) => setBusy(field.id, busy)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`note-${field.id}`}>Napomena (opciono)</Label>
                <Input
                  id={`note-${field.id}`}
                  disabled={isPending}
                  {...form.register(`expenses.${index}.note`)}
                />
              </div>
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          disabled={isPending}
          onClick={() => expenseFields.append(newExpense(trip))}
        >
          <Plus className="size-4" aria-hidden />
          Dodaj trošak
        </Button>
        {errors.expenses?.message ? (
          <p className="text-destructive text-xs">{errors.expenses.message}</p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Vreme vožnje</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="started-at">Početak vožnje</Label>
            <Controller
              control={form.control}
              name="startedAt"
              render={({ field }) => (
                <DateTimeField
                  id="started-at"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  disabled={isPending}
                  className="h-11"
                />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="finished-at">Završetak vožnje</Label>
            <Controller
              control={form.control}
              name="finishedAt"
              render={({ field }) => (
                <DateTimeField
                  id="finished-at"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  disabled={isPending}
                  aria-invalid={Boolean(errors.finishedAt)}
                  className="h-11"
                />
              )}
            />
            {errors.finishedAt?.message ? (
              <p className="text-destructive text-xs">{errors.finishedAt.message}</p>
            ) : null}
          </div>
        </div>

        <p className="text-muted-foreground text-sm">
          Ako vožnja ide u inostranstvo, upišite kada ste prešli granicu Srbije.
        </p>
        {borderFields.fields.map((field, index) => (
          <div key={field.id} className="space-y-2 rounded-xl border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Prelazak granice {index + 1}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Ukloni prelazak granice"
                disabled={isPending}
                onClick={() => borderFields.remove(index)}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
            <Controller
              control={form.control}
              name={`borderCrossings.${index}.direction`}
              render={({ field: directionField }) => (
                <div className="grid grid-cols-2 gap-2">
                  {(['OUT', 'IN'] as const).map((direction) => (
                    <Button
                      key={direction}
                      type="button"
                      className="h-11"
                      variant={directionField.value === direction ? 'default' : 'outline'}
                      disabled={isPending}
                      onClick={() => directionField.onChange(direction)}
                    >
                      {DIRECTION_LABELS[direction]}
                    </Button>
                  ))}
                </div>
              )}
            />
            <Controller
              control={form.control}
              name={`borderCrossings.${index}.at`}
              render={({ field }) => (
                <DateTimeField
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  disabled={isPending}
                  aria-invalid={Boolean(errors.borderCrossings?.[index]?.at)}
                  className="h-11"
                />
              )}
            />
            {errors.borderCrossings?.[index]?.at?.message ? (
              <p className="text-destructive text-xs">
                {errors.borderCrossings[index]?.at?.message}
              </p>
            ) : null}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          disabled={isPending}
          onClick={() =>
            borderFields.append({
              direction: borderFields.fields.length % 2 === 0 ? 'OUT' : 'IN',
              at: '',
            })
          }
        >
          <Plus className="size-4" aria-hidden />
          Dodaj prelazak granice
        </Button>
      </section>

      <section className="space-y-1.5">
        <Label htmlFor="report-note">Napomena za kancelariju (opciono)</Label>
        <Textarea id="report-note" rows={3} disabled={isPending} {...form.register('note')} />
      </section>

      <Button type="submit" className="h-12 w-full text-base" disabled={isPending || isUploading}>
        {isPending ? 'Slanje…' : isUploading ? 'Čeka se slika računa…' : 'Pošalji'}
      </Button>
    </form>
  );
}
