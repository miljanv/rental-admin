'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  DRIVER_EXPENSE_PAYMENT_METHODS,
  DRIVER_REPORT_EXPENSE_STATUS_LABELS,
  TRIP_EXPENSE_CATEGORY_LABELS,
  TRIP_EXPENSE_PAYMENT_METHOD_LABELS,
  driverReportWriteSchema,
  type DriverPortalTripDto,
  type DriverReportWriteInput,
  type DriverReportWriteRequest,
  type TripExpenseCategory,
} from '@rental-admin/shared';
import {
  BedDouble,
  ChevronRight,
  FileText,
  Flag,
  Fuel,
  type LucideIcon,
  Milestone,
  Plus,
  Receipt,
  SquareParking,
  Trash2,
  TriangleAlert,
  Utensils,
  Wrench,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { DateTimeField } from '@/components/common/date-time-field';
import { Textarea } from '@/components/ui/textarea';
import {
  PortalAdvanceCard,
  PortalAssignmentCard,
} from '@/features/driver-portal/components/portal-assignment-card';
import {
  PortalExpenseEditor,
  type PortalPaymentOption,
} from '@/features/driver-portal/components/portal-expense-editor';
import { PortalKmCard } from '@/features/driver-portal/components/portal-km-card';
import {
  PortalCard,
  PortalChip,
  PortalChoice,
  PortalFieldLabel,
} from '@/features/driver-portal/components/portal-ui';
import { usePortalMe } from '@/features/driver-portal/hooks/use-portal-me';
import { useSubmitPortalReport } from '@/features/driver-portal/hooks/use-submit-portal-report';
import {
  KM_STEP_FIELDS,
  formatPortalAmount,
  kmReadingIssues,
  portalHref,
} from '@/features/driver-portal/lib/portal';
import { cn } from '@/lib/utils';

export type PortalTripStep = 'voznja' | 'troskovi';

interface PortalReportFormProps {
  token: string;
  trip: DriverPortalTripDto;
  step: PortalTripStep;
  onStepChange: (step: PortalTripStep) => void;
}

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

const DIRECTION_LABELS = { OUT: 'Izlazak iz Srbije', IN: 'Ulazak u Srbiju' } as const;

const CATEGORY_ICONS: Record<TripExpenseCategory, LucideIcon> = {
  FUEL: Fuel,
  TOLL: Milestone,
  PARKING: SquareParking,
  FOOD: Utensils,
  LODGING: BedDouble,
  PER_DIEM: Receipt,
  ROADSIDE_REPAIR: Wrench,
  VISA_PERMIT: FileText,
  OTHER: Receipt,
};

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

const amountOf = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const isBlankExpense = (expense: ExpenseInput | undefined): boolean =>
  !expense?.id && amountOf(expense?.amount) === 0 && !expense?.fileId;

function ExpenseIcon({ category }: { category: TripExpenseCategory }) {
  const Icon = CATEGORY_ICONS[category];

  return (
    <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-xl">
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

/** The trip in two steps: assignment and odometer, then costs and sending to the office. */
export function PortalReportForm({ token, trip, step, onStepChange }: PortalReportFormProps) {
  const router = useRouter();
  const mutation = useSubmitPortalReport(token, trip.id);
  const form = useForm<DriverReportWriteInput, unknown, DriverReportWriteRequest>({
    resolver: zodResolver(driverReportWriteSchema),
    defaultValues: formValues(trip),
  });
  const expenseFields = useFieldArray({ control: form.control, name: 'expenses' });
  const borderFields = useFieldArray({ control: form.control, name: 'borderCrossings' });
  const paymentCards = usePortalMe(token).data?.paymentCards ?? [];
  // Cash plus each company card ("OMV kartica"); without cards, one plain company card option.
  const paymentOptions: PortalPaymentOption[] = [
    {
      method: 'CASH',
      cardId: '',
      label: TRIP_EXPENSE_PAYMENT_METHOD_LABELS.CASH,
      hint: 'Umanjuje akontaciju',
    },
    ...(paymentCards.length > 0
      ? paymentCards.map((card) => ({
          method: 'COMPANY_CARD' as const,
          cardId: card.id,
          label: card.name,
          hint: 'Službena kartica, ne umanjuje akontaciju',
        }))
      : DRIVER_EXPENSE_PAYMENT_METHODS.filter((method) => method !== 'CASH').map((method) => ({
          method,
          cardId: '',
          label: TRIP_EXPENSE_PAYMENT_METHOD_LABELS[method],
          hint: 'Ne umanjuje akontaciju',
        }))),
  ];
  const vehicles = useWatch({ control: form.control, name: 'vehicles' }) ?? [];
  const watchedExpenses = useWatch({ control: form.control, name: 'expenses' }) ?? [];
  const [editing, setEditing] = useState<number | null>(null);
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

  // Everything that counts against the advance: handled costs (not rejected) and the form's.
  const countedExpenses = [
    ...handledExpenses
      .filter((expense) => expense.status !== 'REJECTED')
      .map((expense) => ({ amount: expense.amount, paymentMethod: expense.paymentMethod })),
    ...watchedExpenses.map((expense) => ({
      amount: amountOf(expense?.amount),
      paymentMethod: expense?.paymentMethod ?? 'CASH',
    })),
  ];
  const totalCost = countedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const cashCost = countedExpenses
    .filter((expense) => expense.paymentMethod === 'CASH')
    .reduce((sum, expense) => sum + expense.amount, 0);
  const advance = trip.assignment.advanceAmount ?? 0;
  const advanceBefore = (index: number): number | null =>
    advance > 0
      ? advance -
        cashCost +
        (watchedExpenses[index]?.paymentMethod === 'CASH'
          ? amountOf(watchedExpenses[index]?.amount)
          : 0)
      : null;

  const missingKm = trip.vehicles.flatMap((vehicle, index) => {
    const steps = KM_STEP_FIELDS.flatMap((field, step) =>
      typeof vehicles[index]?.[field] === 'number' && Number.isFinite(vehicles[index]?.[field])
        ? []
        : [step + 1],
    );

    return steps.length > 0
      ? [
          `kilometražu ${steps.join(' i ')}${trip.vehicles.length > 1 ? ` (${vehicle.licensePlate})` : ''}`,
        ]
      : [];
  });
  const missingReceipts = watchedExpenses.flatMap((expense) =>
    expense && !expense.fileId && expense.category
      ? [
          `račun za ${TRIP_EXPENSE_CATEGORY_LABELS[expense.category].toLowerCase()} ${formatPortalAmount(amountOf(expense.amount))} RSD`,
        ]
      : [],
  );
  const reminders = [...missingKm, ...missingReceipts];

  const closeEditor = () => {
    if (editing !== null && isBlankExpense(form.getValues(`expenses.${editing}`))) {
      expenseFields.remove(editing);
    }

    setEditing(null);
  };

  const saveExpense = async () => {
    if (editing === null) {
      return;
    }

    if (await form.trigger(`expenses.${editing}`)) {
      setEditing(null);
    }
  };

  /**
   * Readings must continue from the step before and not go under the vehicle's current odometer.
   * Goes back to the odometer step when they don't; true when all is in order.
   */
  const checkKm = (readings: DriverReportWriteInput['vehicles']): boolean => {
    // The odometer card shows each problem under its field as the driver types.
    const ok = trip.vehicles.every(
      (vehicle, index) =>
        Object.keys(kmReadingIssues(readings?.[index], vehicle.minKm)).length === 0,
    );

    if (!ok) {
      onStepChange('voznja');
      toast.error('Proverite kilometražu: svaki korak mora da se nastavlja na prethodni.');
    }

    return ok;
  };

  const onSubmit = form.handleSubmit(
    async (values) => {
      if (!checkKm(values.vehicles)) {
        return;
      }

      try {
        await mutation.mutateAsync(values);
        router.push(portalHref(token));
      } catch {
        // The mutation reports the failure as a toast.
      }
    },
    (invalid) => {
      if (invalid.vehicles) {
        onStepChange('voznja');
        toast.error('Proverite kilometražu.');
        return;
      }

      const badExpense = invalid.expenses
        ? Object.keys(invalid.expenses).map(Number).find(Number.isInteger)
        : undefined;

      if (badExpense !== undefined) {
        onStepChange('troskovi');
        setEditing(badExpense);
      }

      toast.error('Proverite unete podatke.');
    },
  );

  if (step === 'voznja') {
    return (
      <div className="flex flex-col gap-4">
        <PortalAssignmentCard token={token} trip={trip} />
        <PortalAdvanceCard token={token} trip={trip} expenses={countedExpenses} />
        {trip.vehicles.length === 0 ? (
          <PortalCard className="text-muted-foreground p-[18px] text-sm">
            Vožnji još nije dodeljeno vozilo. Javite se kancelariji.
          </PortalCard>
        ) : (
          trip.vehicles.map((vehicle, index) => (
            <PortalKmCard
              key={vehicle.id}
              form={form}
              index={index}
              vehicle={vehicle}
              showPlate={trip.vehicles.length > 1}
              disabled={isPending}
            />
          ))
        )}
        <button
          type="button"
          onClick={() => {
            if (checkKm(form.getValues('vehicles'))) {
              onStepChange('troskovi');
            }
          }}
          className="bg-foreground text-background flex h-[52px] items-center justify-center gap-2 rounded-[14px] text-[15px] font-semibold"
        >
          Nastavi na troškove
          <ChevronRight className="size-[18px]" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <section className="grid grid-cols-3 gap-2">
        <PortalCard className="p-3">
          <p className="text-muted-foreground text-xs">Ukupno</p>
          <p className="mt-1 text-base font-bold">{formatPortalAmount(totalCost)}</p>
          <p className="text-muted-foreground text-xs">RSD</p>
        </PortalCard>
        <PortalCard className="p-3">
          <p className="text-muted-foreground text-xs">Keš</p>
          <p className="mt-1 text-base font-bold">{formatPortalAmount(cashCost)}</p>
          <p className="text-muted-foreground text-xs">RSD</p>
        </PortalCard>
        {advance > 0 ? (
          <PortalCard className="border-green-200 bg-green-50 p-3 text-green-800 dark:border-green-500/25 dark:bg-green-500/10 dark:text-green-300">
            <p className="text-xs">Akontacija ostaje</p>
            <p className="mt-1 text-base font-bold">{formatPortalAmount(advance - cashCost)}</p>
            <p className="text-xs">RSD</p>
          </PortalCard>
        ) : (
          <PortalCard className="p-3">
            <p className="text-muted-foreground text-xs">Akontacija</p>
            <p className="mt-1 text-base font-bold">—</p>
          </PortalCard>
        )}
      </section>

      {handledExpenses.length + watchedExpenses.length > (editing !== null ? 1 : 0) ? (
        <PortalCard className="overflow-hidden">
          {handledExpenses.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center gap-3 border-b px-4 py-3.5 last:border-b-0"
            >
              <ExpenseIcon category={expense.category} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">
                  {TRIP_EXPENSE_CATEGORY_LABELS[expense.category]}
                </p>
                <PortalChip
                  tone={expense.status === 'ACCEPTED' ? 'green' : 'red'}
                  className="mt-1.5 px-2 py-0.5"
                >
                  {DRIVER_REPORT_EXPENSE_STATUS_LABELS[expense.status]}
                </PortalChip>
                {expense.status === 'REJECTED' && expense.rejectionReason ? (
                  <p className="text-destructive mt-1 text-xs">Razlog: {expense.rejectionReason}</p>
                ) : null}
              </div>
              <p className="text-[15px] font-bold whitespace-nowrap">
                {formatPortalAmount(expense.amount)} RSD
              </p>
            </div>
          ))}
          {expenseFields.fields.map((field, index) => {
            if (index === editing) {
              return null;
            }

            const expense = watchedExpenses[index];
            const category = expense?.category ?? 'OTHER';
            const payment =
              paymentOptions.find(
                (option) =>
                  option.method === expense?.paymentMethod &&
                  (option.method === 'CASH' || option.cardId === (expense?.paymentCardId ?? '')),
              )?.label ?? TRIP_EXPENSE_PAYMENT_METHOD_LABELS.CASH;
            const hasError = Boolean(errors.expenses?.[index]);

            return (
              <div key={field.id} className="flex items-center gap-1 border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => setEditing(index)}
                  disabled={isPending || editing !== null}
                  className="active:bg-accent flex min-w-0 flex-1 items-center gap-3 py-3.5 pl-4 text-left"
                >
                  <ExpenseIcon category={category} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold">
                      {TRIP_EXPENSE_CATEGORY_LABELS[category]}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {payment}
                      {expense?.fileId ? ' · račun priložen' : ''}
                    </p>
                    {hasError ? (
                      <PortalChip tone="red" className="mt-1.5 px-2 py-0.5">
                        Proverite unos
                      </PortalChip>
                    ) : expense?.fileId ? null : (
                      <PortalChip tone="amber" className="mt-1.5 px-2 py-0.5">
                        Nedostaje račun
                      </PortalChip>
                    )}
                  </div>
                  <p className="text-[15px] font-bold whitespace-nowrap">
                    {formatPortalAmount(amountOf(expense?.amount))} RSD
                  </p>
                </button>
                <button
                  type="button"
                  aria-label="Ukloni trošak"
                  disabled={isPending || editing !== null}
                  onClick={() => expenseFields.remove(index)}
                  className="text-muted-foreground flex size-11 shrink-0 items-center justify-center"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            );
          })}
        </PortalCard>
      ) : null}

      {editing !== null && expenseFields.fields[editing] ? (
        <PortalExpenseEditor
          key={expenseFields.fields[editing].id}
          token={token}
          form={form}
          index={editing}
          trip={trip}
          paymentOptions={paymentOptions}
          advanceBefore={advanceBefore(editing)}
          fileName={(() => {
            const fileId = watchedExpenses[editing]?.fileId;

            return fileId ? (fileNames[fileId] ?? 'Račun priložen') : null;
          })()}
          disabled={isPending}
          onUploaded={(file) =>
            setFileNames((current) => ({ ...current, [file.id]: file.originalName }))
          }
          onBusyChange={(busy) => setBusy(String(editing), busy)}
          onSave={() => void saveExpense()}
          onClose={closeEditor}
        />
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            expenseFields.append(newExpense(trip));
            setEditing(expenseFields.fields.length);
          }}
          className="bg-card hover:bg-accent border-foreground flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold"
        >
          <Plus className="size-4" aria-hidden />
          Dodaj trošak
        </button>
      )}
      {errors.expenses?.message ? (
        <p className="text-destructive text-xs">{errors.expenses.message}</p>
      ) : null}

      <PortalCard className="flex flex-col gap-3.5 p-[18px]">
        <h2 className="text-base font-bold">Vreme vožnje</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <PortalFieldLabel htmlFor="started-at">Početak</PortalFieldLabel>
            <Controller
              control={form.control}
              name="startedAt"
              render={({ field }) => (
                <DateTimeField
                  id="started-at"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  disabled={isPending}
                  className="h-12"
                />
              )}
            />
          </div>
          <div>
            <PortalFieldLabel htmlFor="finished-at">Završetak</PortalFieldLabel>
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
                  className="h-12"
                />
              )}
            />
          </div>
        </div>
        {errors.finishedAt?.message ? (
          <p className="text-destructive text-xs">{errors.finishedAt.message}</p>
        ) : null}

        {borderFields.fields.map((field, index) => (
          <div key={field.id} className="bg-muted/70 flex flex-col gap-2.5 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <Flag className="size-5 shrink-0" aria-hidden />
              <p className="flex-1 text-sm font-semibold">Prelazak granice {index + 1}</p>
              <button
                type="button"
                aria-label="Ukloni prelazak granice"
                disabled={isPending}
                onClick={() => borderFields.remove(index)}
                className="text-muted-foreground flex size-9 items-center justify-center"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
            <Controller
              control={form.control}
              name={`borderCrossings.${index}.direction`}
              render={({ field: directionField }) => (
                <div className="grid grid-cols-2 gap-2">
                  {(['OUT', 'IN'] as const).map((direction) => (
                    <PortalChoice
                      key={direction}
                      selected={directionField.value === direction}
                      disabled={isPending}
                      onClick={() => directionField.onChange(direction)}
                      className="h-11 text-[13px]"
                    >
                      {DIRECTION_LABELS[direction]}
                    </PortalChoice>
                  ))}
                </div>
              )}
            />
            <Controller
              control={form.control}
              name={`borderCrossings.${index}.at`}
              render={({ field: atField }) => (
                <DateTimeField
                  value={atField.value ?? ''}
                  onChange={atField.onChange}
                  disabled={isPending}
                  aria-invalid={Boolean(errors.borderCrossings?.[index]?.at)}
                  className="h-12"
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
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            borderFields.append({
              direction: borderFields.fields.length % 2 === 0 ? 'OUT' : 'IN',
              at: '',
            })
          }
          className="bg-card hover:bg-accent h-11 rounded-xl border text-sm font-semibold"
        >
          + Dodaj prelazak granice
        </button>
      </PortalCard>

      <PortalCard className="p-[18px]">
        <label htmlFor="report-note" className="mb-2.5 block text-base font-bold">
          Napomena za kancelariju
        </label>
        <Textarea
          id="report-note"
          rows={3}
          placeholder="Sve što kancelarija treba da zna o ovoj vožnji"
          disabled={isPending}
          className="bg-card rounded-xl border-[1.5px] text-[15px]"
          {...form.register('note')}
        />
      </PortalCard>

      <section className="flex flex-col gap-2.5 pt-1 pb-8">
        {reminders.length > 0 ? (
          <div className="flex items-start gap-2 rounded-xl bg-amber-100 p-3 text-[13px] text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
            <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden />
            <p>Pre slanja proverite: {reminders.join(', ')}.</p>
          </div>
        ) : null}
        <button
          type="submit"
          disabled={isPending || isUploading || editing !== null}
          className={cn(
            'bg-primary text-primary-foreground h-14 rounded-[14px] text-base font-semibold',
            'disabled:opacity-50',
          )}
        >
          {isPending
            ? 'Slanje…'
            : isUploading
              ? 'Čeka se slika računa…'
              : editing !== null
                ? 'Prvo sačuvajte trošak'
                : 'Pošalji kancelariji'}
        </button>
        <p className="text-muted-foreground text-center text-xs">
          Kilometraža se upisuje odmah, troškove kancelarija prihvata posle provere.
        </p>
      </section>
    </form>
  );
}
