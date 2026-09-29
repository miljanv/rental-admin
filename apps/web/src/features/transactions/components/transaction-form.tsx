'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  TRANSACTION_CATEGORIES,
  TRANSACTION_CATEGORY_LABELS,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPES,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type TransactionDto,
  type TransactionWriteRequest,
} from '@rental-admin/shared';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { DateField } from '@/components/common/date-field';
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
import { useDrivers } from '@/features/drivers/hooks/use-drivers';
import { PartnerNameInput } from '@/features/partners/components/partner-name-input';
import { PaymentMethodSelect } from '@/features/transactions/components/payment-method-select';
import { SupplierNameInput } from '@/features/transactions/components/supplier-name-input';
import { useCreateTransaction } from '@/features/transactions/hooks/use-create-transaction';
import { useUpdateTransaction } from '@/features/transactions/hooks/use-update-transaction';
import {
  EMPTY_TRANSACTION_FORM,
  transactionFormSchema,
  type TransactionFormValues,
} from '@/features/transactions/schemas/transaction-form-schema';
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles';
import { vehicleLabel } from '@/features/vehicles/lib/vehicle';
import { cn } from '@/lib/utils';

interface TransactionFormProps {
  transaction?: TransactionDto;
  onDone: () => void;
  fixedPaymentMethod?: PaymentMethod;
  title?: string;
  description?: string;
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

export function TransactionForm({
  transaction,
  onDone,
  fixedPaymentMethod,
  title,
  description,
}: TransactionFormProps) {
  const isEdit = Boolean(transaction);
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const vehiclesQuery = useVehicles({
    page: 1,
    limit: 100,
    sortBy: 'make',
    sortOrder: 'asc',
  });
  const driversQuery = useDrivers({
    page: 1,
    limit: 100,
    sortBy: 'lastName',
    sortOrder: 'asc',
  });
  const vehicles = vehiclesQuery.data?.vehicles ?? [];
  const drivers = driversQuery.data?.drivers ?? [];

  const form = useForm<TransactionFormValues, unknown, TransactionWriteRequest>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: transaction
      ? {
          type: transaction.type,
          category: transaction.category,
          amount: transaction.amount,
          occurredAt: transaction.occurredAt,
          paymentMethod: fixedPaymentMethod ?? transaction.paymentMethod,
          note: transaction.note ?? '',
          supplier: transaction.supplier ?? '',
          partner: transaction.partner ?? '',
          route: transaction.route ?? '',
          vehicleId: transaction.vehicle?.id ?? '',
          driverId: transaction.driver?.id ?? '',
          contractId: transaction.contractId ?? '',
          isAdvance: transaction.isAdvance,
        }
      : {
          ...EMPTY_TRANSACTION_FORM,
          paymentMethod: fixedPaymentMethod ?? EMPTY_TRANSACTION_FORM.paymentMethod,
        },
  });

  const isAdvance = useWatch({ control: form.control, name: 'isAdvance' });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    const withPaymentMethod = fixedPaymentMethod
      ? { ...values, paymentMethod: fixedPaymentMethod }
      : values;
    const payload: TransactionWriteRequest = isAdvance
      ? { ...withPaymentMethod, type: 'EXPENSE' }
      : withPaymentMethod;

    try {
      if (transaction) {
        await updateMutation.mutateAsync({ id: transaction.id, body: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      onDone();
    } catch {
      // The mutation reports the failure as a toast.
    }
  });

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>{title ?? (isEdit ? 'Izmena transakcije' : 'Nova transakcija')}</CardTitle>
        <CardDescription>
          {description ??
            'Ručni unos van automatskih knjiženja. Avans dobavljaču (NIS, OMV) označite posebno.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              disabled={isPending}
              {...form.register('isAdvance')}
            />
            Avansna uplata dobavljaču
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            {isAdvance ? null : (
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Field id="type" label="Tip" error={errors.type?.message}>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                      <SelectTrigger id="type" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSACTION_TYPES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {TRANSACTION_TYPE_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            )}

            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <Field id="category" label="Kategorija" error={errors.category?.message}>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSACTION_CATEGORIES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {TRANSACTION_CATEGORY_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            <Field id="occurredAt" label="Datum" error={errors.occurredAt?.message}>
              <Controller
                control={form.control}
                name="occurredAt"
                render={({ field }) => (
                  <DateField
                    id="occurredAt"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isPending}
                    aria-invalid={Boolean(errors.occurredAt)}
                  />
                )}
              />
            </Field>

            <Field id="amount" label="Iznos (RSD)" error={errors.amount?.message}>
              <Input
                id="amount"
                type="number"
                step="0.01"
                inputMode="decimal"
                disabled={isPending}
                aria-invalid={Boolean(errors.amount)}
                {...form.register('amount', { valueAsNumber: true })}
              />
            </Field>

            {fixedPaymentMethod ? (
              <Field id="paymentMethod" label="Način plaćanja">
                <Input
                  id="paymentMethod"
                  value={PAYMENT_METHOD_LABELS[fixedPaymentMethod]}
                  disabled
                />
              </Field>
            ) : (
              <Controller
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <Field
                    id="paymentMethod"
                    label="Način plaćanja"
                    error={errors.paymentMethod?.message}
                  >
                    <PaymentMethodSelect
                      id="paymentMethod"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isPending}
                    />
                  </Field>
                )}
              />
            )}

            <Controller
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <Field id="supplier" label="Dobavljač" error={errors.supplier?.message}>
                  <SupplierNameInput
                    id="supplier"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="NIS, OMV…"
                    disabled={isPending}
                    ariaInvalid={Boolean(errors.supplier)}
                  />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="partner"
              render={({ field }) => (
                <Field id="partner" label="Partner" error={errors.partner?.message}>
                  <PartnerNameInput
                    id="partner"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Agencija, naručilac…"
                    disabled={isPending}
                    ariaInvalid={Boolean(errors.partner)}
                  />
                </Field>
              )}
            />

            <Field id="route" label="Relacija" error={errors.route?.message}>
              <Input
                id="route"
                placeholder="NS–BG, lokalni prevoz…"
                disabled={isPending}
                aria-invalid={Boolean(errors.route)}
                {...form.register('route')}
              />
            </Field>

            <Controller
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <Field id="vehicleId" label="Vozilo" error={errors.vehicleId?.message}>
                  <Select
                    value={field.value || NONE}
                    onValueChange={(value) => field.onChange(value === NONE ? '' : value)}
                    disabled={isPending || vehiclesQuery.isPending}
                  >
                    <SelectTrigger id="vehicleId" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Bez vozila</SelectItem>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicleLabel(vehicle)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="driverId"
              render={({ field }) => (
                <Field id="driverId" label="Vozač" error={errors.driverId?.message}>
                  <Select
                    value={field.value || NONE}
                    onValueChange={(value) => field.onChange(value === NONE ? '' : value)}
                    disabled={isPending || driversQuery.isPending}
                  >
                    <SelectTrigger id="driverId" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Bez vozača</SelectItem>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.firstName} {driver.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>

          <Field id="note" label="Napomena" error={errors.note?.message}>
            <textarea
              id="note"
              rows={3}
              disabled={isPending}
              aria-invalid={Boolean(errors.note)}
              className={cn(
                'border-input w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-2 text-sm outline-none',
                'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
              {...form.register('note')}
            />
          </Field>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
              Otkaži
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Čuvanje…' : isEdit ? 'Sačuvaj izmene' : 'Dodaj transakciju'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
