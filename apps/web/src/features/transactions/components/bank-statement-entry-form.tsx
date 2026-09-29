'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  TRANSACTION_CATEGORIES,
  TRANSACTION_CATEGORY_LABELS,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPES,
  type BankStatementEntryWriteRequest,
  type TransactionDto,
} from '@rental-admin/shared';
import { Controller, useForm } from 'react-hook-form';

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
import { useCreateBankStatementEntry } from '@/features/transactions/hooks/use-create-bank-statement-entry';
import { useUpdateBankStatementEntry } from '@/features/transactions/hooks/use-update-bank-statement-entry';
import {
  EMPTY_BANK_STATEMENT_ENTRY_FORM,
  bankStatementEntryFormSchema,
  type BankStatementEntryFormValues,
} from '@/features/transactions/schemas/bank-statement-entry-form-schema';
import { PartnerNameInput } from '@/features/partners/components/partner-name-input';
import { SupplierNameInput } from '@/features/transactions/components/supplier-name-input';
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles';
import { vehicleLabel } from '@/features/vehicles/lib/vehicle';

interface BankStatementEntryFormProps {
  transaction?: TransactionDto;
  onDone: () => void;
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

export function BankStatementEntryForm({ transaction, onDone }: BankStatementEntryFormProps) {
  const isEdit = Boolean(transaction);
  const createMutation = useCreateBankStatementEntry();
  const updateMutation = useUpdateBankStatementEntry();
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

  const form = useForm<BankStatementEntryFormValues, unknown, BankStatementEntryWriteRequest>({
    resolver: zodResolver(bankStatementEntryFormSchema),
    defaultValues: transaction
      ? {
          type: transaction.type,
          category: transaction.category,
          amount: transaction.amount,
          occurredAt: transaction.occurredAt,
          statementNumber: transaction.statementNumber ?? '',
          bankReference: transaction.bankReference ?? '',
          note: transaction.note ?? '',
          supplier: transaction.supplier ?? '',
          partner: transaction.partner ?? '',
          partnerId: transaction.partnerId ?? '',
          route: transaction.route ?? '',
          vehicleId: transaction.vehicle?.id ?? '',
          driverId: transaction.driver?.id ?? '',
          contractId: transaction.contractId ?? '',
        }
      : EMPTY_BANK_STATEMENT_ENTRY_FORM,
  });

  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (transaction) {
        await updateMutation.mutateAsync({ id: transaction.id, body: values });
      } else {
        await createMutation.mutateAsync(values);
      }

      onDone();
    } catch {
      // The mutation reports the failure as a toast.
    }
  });

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>{isEdit ? 'Izmena stavke izvoda' : 'Nova stavka izvoda'}</CardTitle>
        <CardDescription>
          Bankarski promet sa izvoda. Troškovi i fakture se zatvaraju kasnije kroz uparivanje.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Field id="statement-type" label="Smer" error={errors.type?.message}>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <SelectTrigger id="statement-type" className="w-full">
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

            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <Field id="statement-category" label="Kategorija" error={errors.category?.message}>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <SelectTrigger id="statement-category" className="w-full">
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

            <Field id="statement-date" label="Datum izvoda" error={errors.occurredAt?.message}>
              <Controller
                control={form.control}
                name="occurredAt"
                render={({ field }) => (
                  <DateField
                    id="statement-date"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isPending}
                    aria-invalid={Boolean(errors.occurredAt)}
                  />
                )}
              />
            </Field>

            <Field id="statement-amount" label="Iznos (RSD)" error={errors.amount?.message}>
              <Input
                id="statement-amount"
                type="number"
                step="0.01"
                inputMode="decimal"
                disabled={isPending}
                aria-invalid={Boolean(errors.amount)}
                {...form.register('amount', { valueAsNumber: true })}
              />
            </Field>

            <Field
              id="statement-number"
              label="Broj izvoda"
              error={errors.statementNumber?.message}
            >
              <Input
                id="statement-number"
                placeholder="npr. 175"
                disabled={isPending}
                aria-invalid={Boolean(errors.statementNumber)}
                {...form.register('statementNumber')}
              />
            </Field>

            <Field
              id="bank-reference"
              label="Poziv / referenca"
              error={errors.bankReference?.message}
            >
              <Input
                id="bank-reference"
                placeholder="Poziv na broj ili ID stavke"
                disabled={isPending}
                aria-invalid={Boolean(errors.bankReference)}
                {...form.register('bankReference')}
              />
            </Field>

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
                    placeholder="Za isplate"
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
                <Field id="partner" label="Kupac / partner" error={errors.partner?.message}>
                  <PartnerNameInput
                    id="partner"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Za uplate"
                    disabled={isPending}
                    ariaInvalid={Boolean(errors.partner)}
                  />
                </Field>
              )}
            />

            <Field id="route" label="Relacija / opis posla" error={errors.route?.message}>
              <Input
                id="route"
                placeholder="Opcionalno"
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
                      <SelectValue placeholder="Nije vezano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Nije vezano</SelectItem>
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
                      <SelectValue placeholder="Nije vezano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Nije vezano</SelectItem>
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

            <Field id="contractId" label="Ugovor / veza" error={errors.contractId?.message}>
              <Input
                id="contractId"
                placeholder="Opcionalno"
                disabled={isPending}
                aria-invalid={Boolean(errors.contractId)}
                {...form.register('contractId')}
              />
            </Field>

            <Field id="note" label="Opis sa izvoda" error={errors.note?.message}>
              <Input
                id="note"
                placeholder="Svrha plaćanja"
                disabled={isPending}
                aria-invalid={Boolean(errors.note)}
                {...form.register('note')}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
              Otkaži
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Čuvanje…' : 'Sačuvaj'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
