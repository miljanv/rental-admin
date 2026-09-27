'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  MAX_TRIP_DRIVERS,
  TRIP_EXPENSE_CATEGORIES,
  TRIP_EXPENSE_CATEGORY_LABELS,
  TRIP_EXPENSE_PAYMENT_METHOD_LABELS,
  TRIP_EXPENSE_PAYMENT_METHODS,
  tripRouteLabel,
  tripSettlementWriteSchema,
  type TripDto,
  type TripExpenseCategory,
  type TripExpensePaymentMethod,
  type TripSettlementWriteInput,
  type TripSettlementWriteRequest,
} from '@rental-admin/shared';
import { Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useDrivers } from '@/features/drivers/hooks/use-drivers';
import { useCreateTripExpense } from '@/features/trips/hooks/use-create-trip-expense';
import { useDeleteTripExpense } from '@/features/trips/hooks/use-delete-trip-expense';
import { useTripSettlement } from '@/features/trips/hooks/use-trip-settlement';
import { useUpdateTripSettlement } from '@/features/trips/hooks/use-update-trip-settlement';
import { formatMoney } from '@/lib/format';

interface TripSettlementSheetProps {
  trip: TripDto | null;
  onOpenChange: (open: boolean) => void;
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ id, label, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}

const emptySettlement = {
  paidAt: '',
  carrierId: '',
  startKm: '' as const,
  endKm: '' as const,
  fuelLiters: '' as const,
  drivers: [] as TripSettlementWriteInput['drivers'],
};

export function TripSettlementSheet({ trip, onOpenChange }: TripSettlementSheetProps) {
  const [sheetTrip, setSheetTrip] = useState<TripDto | null>(trip);

  useEffect(() => {
    if (trip) {
      setSheetTrip(trip);
    }
  }, [trip]);

  const tripId = sheetTrip?.id ?? '';
  const query = useTripSettlement(tripId);
  const saveMutation = useUpdateTripSettlement(tripId);
  const createExpense = useCreateTripExpense(tripId);
  const deleteExpense = useDeleteTripExpense(tripId);
  const driversQuery = useDrivers({ page: 1, limit: 100, sortBy: 'lastName', sortOrder: 'asc' });
  const settlement = query.data;
  const [expenseCategory, setExpenseCategory] = useState<TripExpenseCategory>('TOLL');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePayment, setExpensePayment] = useState<TripExpensePaymentMethod>('CASH');

  const form = useForm<TripSettlementWriteInput, unknown, TripSettlementWriteRequest>({
    resolver: zodResolver(tripSettlementWriteSchema),
    defaultValues: emptySettlement,
  });
  const loadedTripId = useRef<string | null>(null);

  useEffect(() => {
    if (!sheetTrip || !settlement || settlement.tripId !== sheetTrip.id) {
      return;
    }

    if (loadedTripId.current === sheetTrip.id) {
      return;
    }

    form.reset({
      paidAt: settlement.paidAt ?? '',
      carrierId: settlement.carrierId ?? '',
      startKm: settlement.startKm ?? '',
      endKm: settlement.endKm ?? '',
      fuelLiters: settlement.fuelLiters ?? '',
      drivers: settlement.drivers.map((driver) => ({
        driverId: driver.id,
        perDiemAmount: driver.perDiemAmount ?? '',
        advanceAmount: driver.advanceAmount ?? '',
      })),
    });
    loadedTripId.current = sheetTrip.id;
  }, [form, settlement, sheetTrip]);

  const errors = form.formState.errors;
  const selectedDrivers = useWatch({ control: form.control, name: 'drivers' }) ?? [];
  const driverOptions = driversQuery.data?.drivers ?? [];
  const assignedIds = new Set(selectedDrivers.map((driver) => driver.driverId));

  const driverName = (driverId: string): string => {
    const assigned = settlement?.drivers.find((driver) => driver.id === driverId);
    if (assigned) {
      return `${assigned.firstName} ${assigned.lastName}`;
    }

    const listed = driverOptions.find((driver) => driver.id === driverId);
    return listed ? `${listed.firstName} ${listed.lastName}` : driverId;
  };

  const onSubmit = form.handleSubmit(async (values) => {
    await saveMutation.mutateAsync(values);
    onOpenChange(false);
  });

  const addExpense = async () => {
    const amount = Number(expenseAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    await createExpense.mutateAsync({
      category: expenseCategory,
      amount,
      paymentMethod: expensePayment,
      note: null,
      fileId: null,
    });
    setExpenseAmount('');
  };

  return (
    <Sheet open={trip != null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Obračun</SheetTitle>
          <SheetDescription>
            {sheetTrip ? tripRouteLabel(sheetTrip) : 'Vožnja'}. Vozač, plata, kilometraža, gorivo,
            troškovi ture i akontacija.
          </SheetDescription>
        </SheetHeader>

        {query.isPending ? (
          <p className="text-muted-foreground px-4 text-sm">Učitavanje obračuna…</p>
        ) : query.isError || !settlement ? (
          <p className="text-destructive px-4 text-sm">Obračun nije učitan.</p>
        ) : (
          <div className="flex flex-col gap-6 px-4 pb-4">
            <form onSubmit={onSubmit} noValidate className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <p className="text-sm font-medium">Vozač</p>
                  {selectedDrivers.length < MAX_TRIP_DRIVERS ? (
                    <Select
                      key={selectedDrivers.map((driver) => driver.driverId).join(',')}
                      onValueChange={(driverId) => {
                        form.setValue(
                          'drivers',
                          [
                            ...selectedDrivers,
                            { driverId, perDiemAmount: '', advanceAmount: '' },
                          ],
                          { shouldDirty: true },
                        );
                      }}
                      disabled={saveMutation.isPending || driversQuery.isPending}
                    >
                      <SelectTrigger className="w-48" aria-label="Dodaj vozača">
                        <SelectValue placeholder="Dodaj vozača" />
                      </SelectTrigger>
                      <SelectContent>
                        {driverOptions
                          .filter((driver) => !assignedIds.has(driver.id))
                          .map((driver) => (
                            <SelectItem key={driver.id} value={driver.id}>
                              {driver.firstName} {driver.lastName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                </div>

                {selectedDrivers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nema dodeljenog vozača.</p>
                ) : (
                  selectedDrivers.map((driver, index) => (
                    <div key={driver.driverId} className="space-y-3 rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{driverName(driver.driverId)}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Ukloni ${driverName(driver.driverId)}`}
                          onClick={() => {
                            form.setValue(
                              'drivers',
                              selectedDrivers.filter((item) => item.driverId !== driver.driverId),
                              { shouldDirty: true },
                            );
                          }}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                          id={`pay-${index}`}
                          label="Plaćeno vozaču (RSD)"
                          error={errors.drivers?.[index]?.perDiemAmount?.message as string | undefined}
                        >
                          <Input
                            id={`pay-${index}`}
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            disabled={saveMutation.isPending}
                            {...form.register(`drivers.${index}.perDiemAmount`, {
                              valueAsNumber: true,
                            })}
                          />
                        </Field>
                        <Field
                          id={`advance-${index}`}
                          label="Akontacija (RSD)"
                          error={errors.drivers?.[index]?.advanceAmount?.message as string | undefined}
                        >
                          <Input
                            id={`advance-${index}`}
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            disabled={saveMutation.isPending}
                            {...form.register(`drivers.${index}.advanceAmount`, {
                              valueAsNumber: true,
                            })}
                          />
                        </Field>
                      </div>
                    </div>
                  ))
                )}
                {errors.drivers?.message ? (
                  <p className="text-destructive text-xs">{errors.drivers.message}</p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  id="sheet-startKm"
                  label="Početni km"
                  error={errors.startKm?.message as string | undefined}
                >
                  <Input
                    id="sheet-startKm"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    disabled={saveMutation.isPending}
                    {...form.register('startKm', { valueAsNumber: true })}
                  />
                </Field>
                <Field
                  id="sheet-endKm"
                  label="Završni km"
                  error={errors.endKm?.message as string | undefined}
                >
                  <Input
                    id="sheet-endKm"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    disabled={saveMutation.isPending}
                    {...form.register('endKm', { valueAsNumber: true })}
                  />
                </Field>
                <Field
                  id="sheet-fuel"
                  label="Gorivo (l)"
                  error={errors.fuelLiters?.message as string | undefined}
                >
                  <Input
                    id="sheet-fuel"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    disabled={saveMutation.isPending}
                    {...form.register('fuelLiters', { valueAsNumber: true })}
                  />
                </Field>
              </div>

              <SheetFooter className="px-0">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Čuvanje…' : 'Sačuvaj obračun'}
                </Button>
              </SheetFooter>
            </form>

            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium">Troškovi na turi</p>
              {settlement.expenses.length === 0 ? (
                <p className="text-muted-foreground text-sm">Još nema plaćenih troškova.</p>
              ) : (
                <ul className="space-y-2">
                  {settlement.expenses.map((expense) => (
                    <li key={expense.id} className="flex items-center justify-between gap-2 text-sm">
                      <span>
                        {TRIP_EXPENSE_CATEGORY_LABELS[expense.category]} · {formatMoney(expense.amount)}
                        <span className="text-muted-foreground">
                          {' '}
                          · {TRIP_EXPENSE_PAYMENT_METHOD_LABELS[expense.paymentMethod]}
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Obriši trošak"
                        disabled={deleteExpense.isPending}
                        onClick={() =>
                          deleteExpense.mutate({
                            expenseId: expense.id,
                            label: TRIP_EXPENSE_CATEGORY_LABELS[expense.category],
                          })
                        }
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="expense-category" label="Vrsta">
                  <Select
                    value={expenseCategory}
                    onValueChange={(value) => setExpenseCategory(value as TripExpenseCategory)}
                  >
                    <SelectTrigger id="expense-category" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIP_EXPENSE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {TRIP_EXPENSE_CATEGORY_LABELS[category]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="expense-amount" label="Iznos (RSD)">
                  <Input
                    id="expense-amount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={expenseAmount}
                    onChange={(event) => setExpenseAmount(event.target.value)}
                  />
                </Field>
                <Field id="expense-payment" label="Plaćeno">
                  <Select
                    value={expensePayment}
                    onValueChange={(value) => setExpensePayment(value as TripExpensePaymentMethod)}
                  >
                    <SelectTrigger id="expense-payment" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIP_EXPENSE_PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {TRIP_EXPENSE_PAYMENT_METHOD_LABELS[method]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={createExpense.isPending}
                onClick={() => void addExpense()}
              >
                {createExpense.isPending ? 'Dodavanje…' : 'Dodaj trošak'}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
