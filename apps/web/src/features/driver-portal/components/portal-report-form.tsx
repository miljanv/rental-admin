'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  DRIVER_EXPENSE_CATEGORIES,
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
    startKm: vehicle.startKm ?? '',
    endKm: vehicle.endKm ?? '',
  })),
  expenses: (trip.report?.expenses ?? [])
    .filter((expense) => expense.status === 'PENDING')
    .map((expense) => ({
      id: expense.id,
      category: expense.category,
      amount: expense.amount,
      paymentMethod: expense.paymentMethod === 'COMPANY_CARD' ? 'COMPANY_CARD' : 'CASH',
      note: expense.note ?? '',
      fileId: expense.file?.id ?? '',
    })),
  note: trip.report?.note ?? '',
});

const NEW_EXPENSE: DriverReportWriteInput['expenses'] extends (infer T)[] | undefined ? T : never =
  {
    id: '',
    category: 'TOLL',
    amount: Number.NaN,
    paymentMethod: 'CASH',
    note: '',
    fileId: '',
  };

/** Odometer per vehicle and expenses with receipt photos for one trip. */
export function PortalReportForm({ token, trip }: PortalReportFormProps) {
  const router = useRouter();
  const mutation = useSubmitPortalReport(token, trip.id);
  const form = useForm<DriverReportWriteInput, unknown, DriverReportWriteRequest>({
    resolver: zodResolver(driverReportWriteSchema),
    defaultValues: formValues(trip),
  });
  const expenseFields = useFieldArray({ control: form.control, name: 'expenses' });
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
            const rowErrors = errors.vehicles?.[index];

            return (
              <div key={vehicle.id} className="space-y-3 rounded-xl border p-4">
                <p className="font-medium">
                  {vehicle.licensePlate}{' '}
                  <span className="text-muted-foreground text-sm font-normal">
                    {vehicle.make} {vehicle.model}
                  </span>
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor={`start-${vehicle.id}`}>Početna kilometraža</Label>
                  <Input
                    id={`start-${vehicle.id}`}
                    type="number"
                    inputMode="numeric"
                    className="h-11 text-base"
                    disabled={isPending}
                    aria-invalid={Boolean(rowErrors?.startKm)}
                    {...form.register(`vehicles.${index}.startKm`, { valueAsNumber: true })}
                  />
                  {vehicle.lastKnownKm !== null ? (
                    <p className="text-muted-foreground text-xs">
                      Poslednje poznato: {formatKm(vehicle.lastKnownKm)}
                    </p>
                  ) : null}
                  {rowErrors?.startKm?.message ? (
                    <p className="text-destructive text-xs">{rowErrors.startKm.message}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`end-${vehicle.id}`}>Završna kilometraža</Label>
                  <Input
                    id={`end-${vehicle.id}`}
                    type="number"
                    inputMode="numeric"
                    className="h-11 text-base"
                    disabled={isPending}
                    aria-invalid={Boolean(rowErrors?.endKm)}
                    {...form.register(`vehicles.${index}.endKm`, { valueAsNumber: true })}
                  />
                  {rowErrors?.endKm?.message ? (
                    <p className="text-destructive text-xs">{rowErrors.endKm.message}</p>
                  ) : distance !== null ? (
                    <p className="text-sm font-medium">Pređeno: {formatKm(distance)}</p>
                  ) : null}
                </div>
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
          </div>
        ))}

        {expenseFields.fields.map((field, index) => {
          const rowErrors = errors.expenses?.[index];
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
                    <Label>Plaćeno</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {DRIVER_EXPENSE_PAYMENT_METHODS.map((method) => (
                        <Button
                          key={method}
                          type="button"
                          className="h-11"
                          variant={paymentField.value === method ? 'default' : 'outline'}
                          disabled={isPending}
                          onClick={() => paymentField.onChange(method)}
                        >
                          {TRIP_EXPENSE_PAYMENT_METHOD_LABELS[method]}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              />

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
          onClick={() => expenseFields.append({ ...NEW_EXPENSE })}
        >
          <Plus className="size-4" aria-hidden />
          Dodaj trošak
        </Button>
        {errors.expenses?.message ? (
          <p className="text-destructive text-xs">{errors.expenses.message}</p>
        ) : null}
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
