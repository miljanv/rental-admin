'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  computeTripSettlement,
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
  advanceTotal,
  netResult,
}: {
  revenue: number;
  expensesTotal: number;
  byCategory: TripExpenseCategoryTotal[];
  perDiemTotal: number;
  advanceTotal: number;
  netResult: number;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Neto rezultat</CardTitle>
        <CardDescription>Prihod minus troškovi, dnevnice i akontacije.</CardDescription>
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
            <dt className="text-muted-foreground">Dnevnice</dt>
            <dd>{formatMoney(perDiemTotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Akontacije</dt>
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
  const partners = partnersQuery.data?.partners ?? [];

  const form = useForm<TripSettlementWriteInput, unknown, TripSettlementWriteRequest>({
    resolver: zodResolver(tripSettlementWriteSchema),
    values: settlement
      ? {
          paidAt: settlement.paidAt ?? '',
          carrierId: settlement.carrierId ?? '',
          drivers: settlement.drivers.map((driver) => ({
            driverId: driver.id,
            perDiemAmount: driver.perDiemAmount,
            advanceAmount: driver.advanceAmount,
          })),
        }
      : {
          paidAt: '',
          carrierId: '',
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
            Datum uplate, stvarni prevoznik i dnevnice po vozaču. Troškovi se unose posebno ispod.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
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
                  Dnevnica je posebna po vozaču. Akontacija je novac dat unapred, koji se kasnije
                  pravda od zarade.
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
                      <Field
                        id={`drivers.${index}.advanceAmount`}
                        label="Akontacija (RSD)"
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
