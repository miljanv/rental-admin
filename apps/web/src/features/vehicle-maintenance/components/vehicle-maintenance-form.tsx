'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { VehicleMaintenanceDto } from '@rental-admin/shared';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateVehicleMaintenance } from '@/features/vehicle-maintenance/hooks/use-create-vehicle-maintenance';
import { useUpdateVehicleMaintenance } from '@/features/vehicle-maintenance/hooks/use-update-vehicle-maintenance';
import {
  EMPTY_MAINTENANCE_FORM,
  vehicleMaintenanceFormSchema,
  type VehicleMaintenanceFormValues,
} from '@/features/vehicle-maintenance/schemas/vehicle-maintenance-form-schema';
import { PaymentMethodSelect } from '@/features/transactions/components/payment-method-select';

interface VehicleMaintenanceFormProps {
  vehicleId: string;
  record?: VehicleMaintenanceDto;
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

export function VehicleMaintenanceForm({ vehicleId, record, onDone }: VehicleMaintenanceFormProps) {
  const isEdit = Boolean(record);
  const createMutation = useCreateVehicleMaintenance(vehicleId);
  const updateMutation = useUpdateVehicleMaintenance(vehicleId);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<VehicleMaintenanceFormValues>({
    resolver: zodResolver(vehicleMaintenanceFormSchema),
    defaultValues: record
      ? {
          date: record.date,
          odometerKm: record.odometerKm,
          partName: record.partName,
          supplier: record.supplier,
          cost: record.cost,
          paymentMethod: record.paymentMethod,
          mechanic: record.mechanic,
        }
      : EMPTY_MAINTENANCE_FORM,
  });

  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (record) {
        await updateMutation.mutateAsync({ maintenanceId: record.id, body: values });
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
        <CardTitle>{isEdit ? 'Izmena zapisa' : 'Nova zamena dela'}</CardTitle>
        <CardDescription>Deo, dobavljač, cena i majstor koji je radio zamenu.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="date" label="Datum" error={errors.date?.message}>
              <Input
                id="date"
                type="date"
                disabled={isPending}
                aria-invalid={Boolean(errors.date)}
                {...form.register('date')}
              />
            </Field>

            <Field id="odometerKm" label="Km na satu" error={errors.odometerKm?.message}>
              <Input
                id="odometerKm"
                type="number"
                inputMode="numeric"
                disabled={isPending}
                aria-invalid={Boolean(errors.odometerKm)}
                {...form.register('odometerKm', { valueAsNumber: true })}
              />
            </Field>

            <Field id="partName" label="Naziv dela" error={errors.partName?.message}>
              <Input
                id="partName"
                disabled={isPending}
                aria-invalid={Boolean(errors.partName)}
                {...form.register('partName')}
              />
            </Field>

            <Field id="supplier" label="Dobavljač" error={errors.supplier?.message}>
              <Input
                id="supplier"
                disabled={isPending}
                aria-invalid={Boolean(errors.supplier)}
                {...form.register('supplier')}
              />
            </Field>

            <Field id="cost" label="Cena" error={errors.cost?.message}>
              <Input
                id="cost"
                type="number"
                step="0.01"
                inputMode="decimal"
                disabled={isPending}
                aria-invalid={Boolean(errors.cost)}
                {...form.register('cost', { valueAsNumber: true })}
              />
            </Field>

            <Controller
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <Field id="paymentMethod" label="Način plaćanja" error={errors.paymentMethod?.message}>
                  <PaymentMethodSelect
                    id="paymentMethod"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isPending}
                  />
                </Field>
              )}
            />

            <Field id="mechanic" label="Majstor" error={errors.mechanic?.message}>
              <Input
                id="mechanic"
                disabled={isPending}
                aria-invalid={Boolean(errors.mechanic)}
                {...form.register('mechanic')}
              />
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
              Otkaži
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Čuvanje…' : isEdit ? 'Sačuvaj izmene' : 'Dodaj zapis'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
