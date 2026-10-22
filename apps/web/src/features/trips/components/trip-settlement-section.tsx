'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  computeTripSettlement,
  ADVANCE_STATUSES,
  ADVANCE_STATUS_LABELS,
  PER_DIEM_CURRENCIES,
  PER_DIEM_STATUS_LABELS,
  PER_DIEM_STATUSES,
  partnerSelectLabel,
  tripSettlementWriteSchema,
  TRIP_EXPENSE_CATEGORY_LABELS,
  type TripExpenseCategoryTotal,
  type TripExpenseDto,
  type TripSettlementWriteInput,
  type TripSettlementWriteRequest,
} from '@rental-admin/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { DateField } from '@/components/common/date-field';
import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { usePartners } from '@/features/partners/hooks/use-partners';
import { DeleteTripExpenseDialog } from '@/features/trips/components/delete-trip-expense-dialog';
import { TripExpenseForm } from '@/features/trips/components/trip-expense-form';
import { TripExpensesTable } from '@/features/trips/components/trip-expenses-table';
import { useTripSettlement } from '@/features/trips/hooks/use-trip-settlement';
import { useUpdateTripSettlement } from '@/features/trips/hooks/use-update-trip-settlement';
import { formatMoney } from '@/lib/format';
import { sortAlphabetically } from '@/lib/sort-options';
import { cn } from '@/lib/utils';

interface TripSettlementSectionProps {
  tripId: string;
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

const NONE = 'none';

function SettlementSummary({
  revenue,
  expensesTotal,
  byCategory,
  perDiemTotal,
  foreignPerDiemTotal,
  perDiemPaidTotal,
  advanceTotal,
  netResult,
}: {
  revenue: number;
  expensesTotal: number;
  byCategory: TripExpenseCategoryTotal[];
  perDiemTotal: number;
  foreignPerDiemTotal: number;
  perDiemPaidTotal: number;
  advanceTotal: number;
  netResult: number;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Neto rezultat</CardTitle>
        <CardDescription>Prihod minus stvarni troškovi i isplaćene dnevnice.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Prihod (cena vožnje)</dt>
            <dd>{formatMoney(revenue)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Troškovi</dt>
            <dd>{formatMoney(expensesTotal)}</dd>
          </div>
          {byCategory.length > 0 ? (
            <div className="space-y-1 pl-3">
              {byCategory.map((row) => (
                <div key={row.category} className="text-muted-foreground flex justify-between gap-4 text-xs">
                  <dt>{TRIP_EXPENSE_CATEGORY_LABELS[row.category]}</dt>
                  <dd>{formatMoney(row.total)}</dd>
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Dnevnice obračunate</dt>
            <dd>{formatMoney(perDiemTotal)}</dd>
          </div>
          {foreignPerDiemTotal > 0 ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Dnevnice obračunate (EUR)</dt>
              <dd>{foreignPerDiemTotal} EUR</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Dnevnice isplaćene (RSD)</dt>
            <dd>{formatMoney(perDiemPaidTotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Akontacije za pravdanje</dt>
            <dd>{formatMoney(advanceTotal)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t pt-2 text-base font-medium">
            <dt>Neto</dt>
            <dd className={cn(netResult < 0 ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-400')}>
              {formatMoney(netResult)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

export function TripSettlementSection({ tripId }: TripSettlementSectionProps) {
  const query = useTripSettlement(tripId);
  const saveMutation = useUpdateTripSettlement(tripId);
  const partnersQuery = usePartners({ page: 1, limit: 100, sortBy: 'type', sortOrder: 'asc' });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<TripExpenseDto | undefined>(undefined);
  const [expenseToDelete, setExpenseToDelete] = useState<TripExpenseDto | null>(null);

  const settlement = query.data;
  const partners = sortAlphabetically(partnersQuery.data?.partners ?? [], partnerSelectLabel);

  const form = useForm<TripSettlementWriteInput, unknown, TripSettlementWriteRequest>({
    resolver: zodResolver(tripSettlementWriteSchema),
    values: settlement
      ? {
          paidAt: settlement.paidAt ?? '',
          carrierId: settlement.carrierId ?? '',
          startKm: settlement.startKm ?? '',
          endKm: settlement.endKm ?? '',
          fuelLiters: settlement.fuelLiters ?? '',
          drivers: settlement.drivers.map((driver) => ({
            driverId: driver.id,
            perDiemAmount: driver.perDiemAmount,
              perDiemCurrency: driver.perDiemCurrency,
              perDiemStatus: driver.perDiemStatus,
              perDiemPaidAmount: driver.perDiemPaidAmount,
              perDiemPaidAt: driver.perDiemPaidAt,
            advanceAmount: driver.advanceAmount,
              advanceStatus: driver.advanceStatus,
              advancePaidAt: driver.advancePaidAt,
          })),
        }
      : {
          paidAt: '',
          carrierId: '',
          startKm: '',
          endKm: '',
          fuelLiters: '',
          drivers: [],
        },
  });

  const errors = form.formState.errors;
  const watchedDrivers = useWatch({ control: form.control, name: 'drivers' }) ?? [];
  const liveTotals = settlement
    ? computeTripSettlement({
        price: settlement.revenue,
        expenses: settlement.expenses,
        drivers: watchedDrivers.map((driver) => ({
          perDiemAmount:
            typeof driver.perDiemAmount === 'number' && Number.isFinite(driver.perDiemAmount)
              ? driver.perDiemAmount
              : null,
          perDiemCurrency: driver.perDiemCurrency ?? 'RSD',
          perDiemStatus: driver.perDiemStatus ?? 'DRAFT',
          perDiemPaidAmount:
            typeof driver.perDiemPaidAmount === 'number' && Number.isFinite(driver.perDiemPaidAmount)
              ? driver.perDiemPaidAmount
              : null,
          advanceAmount:
            typeof driver.advanceAmount === 'number' && Number.isFinite(driver.advanceAmount)
              ? driver.advanceAmount
              : null,
        })),
      })
    : null;

  const onSubmit = form.handleSubmit(async (values) => {
    await saveMutation.mutateAsync(values);
  });

  const openCreate = () => {
    setEditing(undefined);
    setIsFormOpen(true);
  };

  if (query.isPending) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (query.isError || !settlement || !liveTotals) {
    return (
      <ErrorState
        error={query.error ?? new Error('Obračun nije pronađen.')}
        title="Obračun nije učitan"
        retryLabel="Pokušaj ponovo"
        retryingLabel="Učitavanje…"
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Finansijski obračun</CardTitle>
          <CardDescription>
            {settlement.paymentMethod === 'CASH'
              ? 'Naplata se evidentira u Finansije → Keš vožnje. Ovde unosite prevoznika, kilometražu i dnevnice.'
              : 'Datum uplate, stvarni prevoznik i dnevnice po vozaču. Troškovi se unose posebno ispod.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="startKm"
                label="Početni km"
                error={errors.startKm?.message as string | undefined}
              >
                <Input
                  id="startKm"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  disabled={saveMutation.isPending}
                  {...form.register('startKm', { valueAsNumber: true })}
                />
              </Field>
              <Field
                id="endKm"
                label="Završni km"
                error={errors.endKm?.message as string | undefined}
              >
                <Input
                  id="endKm"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  disabled={saveMutation.isPending}
                  {...form.register('endKm', { valueAsNumber: true })}
                />
              </Field>
              <Field
                id="fuelLiters"
                label="Gorivo (l)"
                error={errors.fuelLiters?.message as string | undefined}
              >
                <Input
                  id="fuelLiters"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  disabled={saveMutation.isPending}
                  {...form.register('fuelLiters', { valueAsNumber: true })}
                />
              </Field>
              {settlement.paymentMethod === 'CASH' ? null : (
                <Field id="paidAt" label="Datum uplate" error={errors.paidAt?.message}>
                  <Controller
                    control={form.control}
                    name="paidAt"
                    render={({ field }) => (
                      <DateField
                        id="paidAt"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        disabled={saveMutation.isPending}
                      />
                    )}
                  />
                </Field>
              )}
              <Controller
                control={form.control}
                name="carrierId"
                render={({ field }) => (
                  <Field id="carrierId" label="Prevoznik" error={errors.carrierId?.message}>
                    <Select
                      value={field.value || NONE}
                      onValueChange={(value) => field.onChange(value === NONE ? '' : value)}
                      disabled={saveMutation.isPending || partnersQuery.isPending}
                    >
                      <SelectTrigger id="carrierId" className="w-full">
                        <SelectValue placeholder="Nije izabrano" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Nije izabrano</SelectItem>
                        {partners.map((partner) => (
                          <SelectItem key={partner.id} value={partner.id}>
                            {partnerSelectLabel(partner)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium">Vozači — dnevnice i akontacije</h3>
                <p className="text-muted-foreground text-xs">
                  Dnevnica ulazi u Finansije tek kada je stvarno isplaćena. Akontacija je novac za
                  putne troškove i ne umanjuje rezultat vožnje dok se ne pravda računima.
                </p>
              </div>
              {settlement.drivers.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nema vozača na ovoj vožnji. Dodajte ih u izmeni vožnje da biste uneli dnevnice.
                </p>
              ) : (
                <div className="grid gap-3">
                  {settlement.drivers.map((driver, index) => (
                    <div key={driver.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-3">
                      <p className="self-center text-sm font-medium">
                        {driver.firstName} {driver.lastName}
                      </p>
                      <Field
                        id={`drivers.${index}.perDiemAmount`}
                        label="Dnevnica (RSD)"
                        error={errors.drivers?.[index]?.perDiemAmount?.message as string | undefined}
                      >
                        <Input
                          id={`drivers.${index}.perDiemAmount`}
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          disabled={saveMutation.isPending}
                          {...form.register(`drivers.${index}.perDiemAmount`, { valueAsNumber: true })}
                        />
                      </Field>
                      <Controller
                        control={form.control}
                        name={`drivers.${index}.perDiemCurrency`}
                        render={({ field }) => (
                          <Field id={`drivers.${index}.perDiemCurrency`} label="Valuta dnevnice">
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={saveMutation.isPending}
                            >
                              <SelectTrigger id={`drivers.${index}.perDiemCurrency`} className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PER_DIEM_CURRENCIES.map((currency) => (
                                  <SelectItem key={currency} value={currency}>
                                    {currency}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                        )}
                      />
                      <Controller
                        control={form.control}
                        name={`drivers.${index}.perDiemStatus`}
                        render={({ field }) => (
                          <Field id={`drivers.${index}.perDiemStatus`} label="Status dnevnice">
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                if (value === 'PAID') {
                                  const amount = form.getValues(`drivers.${index}.perDiemAmount`);
                                  const currency = form.getValues(`drivers.${index}.perDiemCurrency`);
                                  if (currency === 'RSD' && form.getValues(`drivers.${index}.perDiemPaidAmount`) == null) {
                                    form.setValue(`drivers.${index}.perDiemPaidAmount`, amount ?? null);
                                  }
                                } else {
                                  form.setValue(`drivers.${index}.perDiemPaidAmount`, null);
                                  form.setValue(`drivers.${index}.perDiemPaidAt`, null);
                                }
                              }}
                              disabled={saveMutation.isPending}
                            >
                              <SelectTrigger id={`drivers.${index}.perDiemStatus`} className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PER_DIEM_STATUSES.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {PER_DIEM_STATUS_LABELS[status]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                        )}
                      />
                      {watchedDrivers[index]?.perDiemStatus === 'PAID' ? (
                        <>
                          <Field
                            id={`drivers.${index}.perDiemPaidAmount`}
                            label="Stvarno isplaćeno (RSD)"
                            error={errors.drivers?.[index]?.perDiemPaidAmount?.message as string | undefined}
                          >
                            <Input
                              id={`drivers.${index}.perDiemPaidAmount`}
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              disabled={saveMutation.isPending}
                              {...form.register(`drivers.${index}.perDiemPaidAmount`, { valueAsNumber: true })}
                            />
                          </Field>
                          <Controller
                            control={form.control}
                            name={`drivers.${index}.perDiemPaidAt`}
                            render={({ field }) => (
                              <Field id={`drivers.${index}.perDiemPaidAt`} label="Datum isplate">
                                <DateField
                                  id={`drivers.${index}.perDiemPaidAt`}
                                  value={field.value ?? ''}
                                  onChange={field.onChange}
                                  disabled={saveMutation.isPending}
                                />
                              </Field>
                            )}
                          />
                        </>
                      ) : null}
                      <Field
                        id={`drivers.${index}.advanceAmount`}
                        label="Akontacija za troškove (RSD)"
                        error={errors.drivers?.[index]?.advanceAmount?.message as string | undefined}
                      >
                        <Input
                          id={`drivers.${index}.advanceAmount`}
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          disabled={saveMutation.isPending}
                          {...form.register(`drivers.${index}.advanceAmount`, { valueAsNumber: true })}
                        />
                      </Field>
                      <Controller
                        control={form.control}
                        name={`drivers.${index}.advanceStatus`}
                        render={({ field }) => (
                          <Field id={`drivers.${index}.advanceStatus`} label="Status akontacije">
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                if (value === 'DRAFT') {
                                  form.setValue(`drivers.${index}.advancePaidAt`, null);
                                }
                              }}
                              disabled={saveMutation.isPending}
                            >
                              <SelectTrigger id={`drivers.${index}.advanceStatus`} className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ADVANCE_STATUSES.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {ADVANCE_STATUS_LABELS[status]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                        )}
                      />
                      {watchedDrivers[index]?.advanceStatus !== 'DRAFT' ? (
                        <Controller
                          control={form.control}
                          name={`drivers.${index}.advancePaidAt`}
                          render={({ field }) => (
                            <Field id={`drivers.${index}.advancePaidAt`} label="Datum predaje">
                              <DateField
                                id={`drivers.${index}.advancePaidAt`}
                                value={field.value ?? ''}
                                onChange={field.onChange}
                                disabled={saveMutation.isPending}
                              />
                            </Field>
                          )}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Čuvanje…' : 'Sačuvaj obračun'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isFormOpen ? (
        <TripExpenseForm
          key={editing?.id ?? 'new'}
          tripId={tripId}
          expense={editing}
          onDone={() => {
            setIsFormOpen(false);
            setEditing(undefined);
          }}
        />
      ) : null}

      <Card className="shadow-none">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Troškovi vožnje</CardTitle>
            <CardDescription>
              Gorivo, putarina, parking i ostalo. Svaka stavka ide i u Finansije.
            </CardDescription>
          </div>
          {isFormOpen ? null : (
            <Button onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              Dodaj trošak
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-0">
          <TripExpensesTable
            expenses={settlement.expenses}
            isLoading={query.isFetching && settlement.expenses.length === 0}
            onEdit={(expense) => {
              setEditing(expense);
              setIsFormOpen(true);
            }}
            onRequestDelete={setExpenseToDelete}
            emptyAction={
              <Button size="sm" onClick={openCreate}>
                Dodaj trošak
              </Button>
            }
          />
        </CardContent>
      </Card>

      <SettlementSummary
        revenue={liveTotals.revenue}
        expensesTotal={liveTotals.expensesTotal}
        byCategory={liveTotals.byCategory}
        perDiemTotal={liveTotals.perDiemTotal}
        foreignPerDiemTotal={liveTotals.foreignPerDiemTotal}
        perDiemPaidTotal={liveTotals.perDiemPaidTotal}
        advanceTotal={liveTotals.advanceTotal}
        netResult={liveTotals.netResult}
      />

      <DeleteTripExpenseDialog
        tripId={tripId}
        expense={expenseToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setExpenseToDelete(null);
          }
        }}
      />
    </div>
  );
}
