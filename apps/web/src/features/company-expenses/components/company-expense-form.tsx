'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  COMPANY_EXPENSE_VAT_RATE_LABELS,
  COMPANY_EXPENSE_VAT_RATES,
  COMPANY_EXPENSE_SCOPE_LABELS,
  splitCompanyExpenseAmount,
  type CompanyExpenseDto,
  type CompanyExpenseScope,
  type CompanyExpenseVatRate,
} from '@rental-admin/shared';
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form';

import { DateField } from '@/components/common/date-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useCreateCompanyExpense } from '@/features/company-expenses/hooks/use-create-company-expense';
import { useUpdateCompanyExpense } from '@/features/company-expenses/hooks/use-update-company-expense';
import {
  companyExpenseFormSchema,
  EMPTY_COMPANY_EXPENSE_FORM,
  toCompanyExpenseFormValues,
  toCompanyExpenseWriteRequest,
  type CompanyExpenseFormValues,
} from '@/features/company-expenses/schemas/company-expense-form-schema';
import { PaymentMethodSelect } from '@/features/transactions/components/payment-method-select';
import { SupplierNameInput } from '@/features/suppliers/components/supplier-name-input';
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles';
import { vehicleLabel } from '@/features/vehicles/lib/vehicle';
import { formatMoney } from '@/lib/format';
import { sortAlphabetically } from '@/lib/sort-options';
import { cn } from '@/lib/utils';

interface CompanyExpenseFormProps {
  expense?: CompanyExpenseDto;
  defaultVehicleId?: string;
  onDone: () => void;
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}

const EXPENSE_SCOPE_OPTIONS: Array<{
  value: CompanyExpenseScope;
  description: string;
}> = [
  { value: 'COMMON', description: 'Opšti trošak firme' },
  { value: 'VEHICLE', description: 'Trošak vozila i kilometraža' },
  { value: 'SUBCONTRACTOR', description: 'Prevoz je izvršio drugi prevoznik' },
  { value: 'BANK', description: 'Naknade, kamate i održavanje računa' },
];

function Field({ id, label, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}

export function CompanyExpenseForm({ expense, defaultVehicleId, onDone }: CompanyExpenseFormProps) {
  const isEdit = Boolean(expense);
  const createMutation = useCreateCompanyExpense();
  const updateMutation = useUpdateCompanyExpense();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const vehiclesQuery = useVehicles({
    page: 1,
    limit: 100,
    sortBy: 'make',
    sortOrder: 'asc',
  });
  const vehicles = sortAlphabetically(vehiclesQuery.data?.vehicles ?? [], vehicleLabel);

  const form = useForm<CompanyExpenseFormValues>({
    resolver: zodResolver(companyExpenseFormSchema) as Resolver<CompanyExpenseFormValues>,
    defaultValues: expense
      ? toCompanyExpenseFormValues(expense)
      : {
          ...EMPTY_COMPANY_EXPENSE_FORM,
          scope: defaultVehicleId ? 'VEHICLE' : 'COMMON',
          vehicleId: defaultVehicleId ?? '',
        },
  });
  const errors = form.formState.errors;
  const vehicleId = useWatch({ control: form.control, name: 'vehicleId' });
  const scope = useWatch({ control: form.control, name: 'scope' });
  const supplier = useWatch({ control: form.control, name: 'supplier' });
  const amount = useWatch({ control: form.control, name: 'amount' });
  const vatRate = useWatch({ control: form.control, name: 'vatRate' });
  const isVehicleExpense = scope === 'VEHICLE';
  const splitPreview =
    typeof amount === 'number' && Number.isFinite(amount) && amount > 0
      ? splitCompanyExpenseAmount(amount, vatRate)
      : null;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const body = toCompanyExpenseWriteRequest(values);

      if (expense) {
        await updateMutation.mutateAsync({ expenseId: expense.id, body });
      } else {
        await createMutation.mutateAsync(body);
      }

      onDone();
    } catch {
      // The mutation reports the failure as a toast.
    }
  });

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>{isEdit ? 'Izmena troška' : 'Novi trošak'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="issuedAt" label="Datum izdavanja računa" error={errors.issuedAt?.message}>
              <Controller
                control={form.control}
                name="issuedAt"
                render={({ field }) => (
                  <DateField
                    id="issuedAt"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isPending}
                    aria-invalid={Boolean(errors.issuedAt)}
                  />
                )}
              />
            </Field>

            <Field id="invoiceNumber" label="Broj računa" error={errors.invoiceNumber?.message}>
              <Input
                id="invoiceNumber"
                disabled={isPending}
                aria-invalid={Boolean(errors.invoiceNumber)}
                {...form.register('invoiceNumber')}
              />
            </Field>

            <Field id="supplier" label="Dobavljač" error={errors.supplier?.message}>
              <SupplierNameInput
                id="supplier"
                disabled={isPending}
                ariaInvalid={Boolean(errors.supplier)}
                value={supplier}
                onChange={(value) => form.setValue('supplier', value, { shouldValidate: true })}
                onBlur={() => form.trigger('supplier')}
              />
            </Field>

            <Controller
              control={form.control}
              name="scope"
              render={({ field }) => (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label id="expense-scope-label">Vrsta troška</Label>
                  <div
                    role="radiogroup"
                    aria-labelledby="expense-scope-label"
                    className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
                  >
                    {EXPENSE_SCOPE_OPTIONS.map((option) => {
                      const isSelected = field.value === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          disabled={isPending}
                          onClick={() => {
                            field.onChange(option.value);

                            if (option.value !== 'VEHICLE') {
                              form.setValue('vehicleId', '', { shouldValidate: true });
                              form.setValue('odometerKm', null, { shouldValidate: true });
                            }
                          }}
                          className={cn(
                            'hover:bg-muted/70 focus-visible:border-ring focus-visible:ring-ring/50 rounded-lg border p-3 text-left outline-none transition-colors focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50',
                            isSelected ? 'border-primary bg-primary/5' : 'border-border',
                          )}
                        >
                          <span className="block text-sm font-medium">
                            {COMPANY_EXPENSE_SCOPE_LABELS[option.value]}
                          </span>
                          <span className="text-muted-foreground mt-1 block text-xs">
                            {option.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.scope?.message ? (
                    <p className="text-destructive text-xs">{errors.scope.message}</p>
                  ) : null}
                </div>
              )}
            />

            {isVehicleExpense ? (
              <Field id="expenseVehicle" label="Vozilo" error={errors.vehicleId?.message}>
                <Select
                  value={vehicleId}
                  onValueChange={(value) => {
                    form.setValue('vehicleId', value, { shouldValidate: true });
                  }}
                  disabled={isPending || vehiclesQuery.isPending}
                >
                  <SelectTrigger id="expenseVehicle" className="w-full">
                    <SelectValue placeholder="Izaberi vozilo" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicleLabel(vehicle)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}

            <Field id="amount" label="Iznos sa PDV-om (RSD)" error={errors.amount?.message}>
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

            <Controller
              control={form.control}
              name="vatRate"
              render={({ field }) => (
                <Field id="vatRate" label="PDV" error={errors.vatRate?.message}>
                  <Select
                    value={String(field.value)}
                    onValueChange={(value) =>
                      field.onChange(Number(value) as CompanyExpenseVatRate)
                    }
                    disabled={isPending}
                  >
                    <SelectTrigger id="vatRate" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_EXPENSE_VAT_RATES.map((rate) => (
                        <SelectItem key={rate} value={String(rate)}>
                          {COMPANY_EXPENSE_VAT_RATE_LABELS[rate]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            {splitPreview ? (
              <p className="text-muted-foreground sm:col-span-2 text-sm">
                Bez PDV-a {formatMoney(splitPreview.amountWithoutVat)} · PDV{' '}
                {formatMoney(splitPreview.vatAmount)}
              </p>
            ) : null}

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

            {isVehicleExpense ? (
              <Field id="odometerKm" label="Km" error={errors.odometerKm?.message}>
                <Input
                  id="odometerKm"
                  type="number"
                  inputMode="numeric"
                  disabled={isPending}
                  aria-invalid={Boolean(errors.odometerKm)}
                  {...form.register('odometerKm', { valueAsNumber: true })}
                />
              </Field>
            ) : null}
          </div>

          <Field id="description" label="Opis troška" error={errors.description?.message}>
            <Textarea
              id="description"
              disabled={isPending}
              rows={3}
              aria-invalid={Boolean(errors.description)}
              {...form.register('description')}
            />
          </Field>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
              Otkaži
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Čuvanje…' : isEdit ? 'Sačuvaj izmene' : 'Dodaj trošak'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
