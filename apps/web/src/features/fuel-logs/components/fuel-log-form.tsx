'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  FUEL_LOG_FUEL_TYPE_LABELS,
  FUEL_LOG_FUEL_TYPES,
  type FuelLogDto,
  type FuelLogWriteRequest,
} from '@rental-admin/shared';
import { Controller, useForm } from 'react-hook-form';

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
import { useCreateFuelLog } from '@/features/fuel-logs/hooks/use-create-fuel-log';
import { useUpdateFuelLog } from '@/features/fuel-logs/hooks/use-update-fuel-log';
import {
  EMPTY_FUEL_LOG_FORM,
  fuelLogFormSchema,
  type FuelLogFormValues,
} from '@/features/fuel-logs/schemas/fuel-log-form-schema';

interface FuelLogFormProps {
  vehicleId: string;
  fuelLog?: FuelLogDto;
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

const NO_DRIVER = 'none';

export function FuelLogForm({ vehicleId, fuelLog, onDone }: FuelLogFormProps) {
  const isEdit = Boolean(fuelLog);
  const createMutation = useCreateFuelLog(vehicleId);
  const updateMutation = useUpdateFuelLog(vehicleId);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const driversQuery = useDrivers({
    page: 1,
    limit: 100,
    sortBy: 'lastName',
    sortOrder: 'asc',
    status: 'ACTIVE',
  });
  const drivers = driversQuery.data?.drivers ?? [];

  const form = useForm<FuelLogFormValues, unknown, FuelLogWriteRequest>({
    resolver: zodResolver(fuelLogFormSchema),
    defaultValues: fuelLog
      ? {
          fueledAt: fuelLog.fueledAt,
          location: fuelLog.location,
          driverId: fuelLog.driver?.id ?? '',
          fuelType: fuelLog.fuelType,
          litersFilled: fuelLog.litersFilled,
          odometerKm: fuelLog.odometerKm,
        }
      : EMPTY_FUEL_LOG_FORM,
  });

  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (fuelLog) {
        await updateMutation.mutateAsync({ fuelLogId: fuelLog.id, body: values });
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
        <CardTitle>{isEdit ? 'Izmena točenja' : 'Novo točenje'}</CardTitle>
        <CardDescription>
          Pređeni km i potrošnja se automatski računaju u odnosu na prethodno stanje km.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="fuelType"
              render={({ field }) => (
                <Field id="fuelType" label="Tip goriva" error={errors.fuelType?.message}>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <SelectTrigger id="fuelType" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FUEL_LOG_FUEL_TYPES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {FUEL_LOG_FUEL_TYPE_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            <Field id="fueledAt" label="Datum točenja" error={errors.fueledAt?.message}>
              <Input
                id="fueledAt"
                type="date"
                disabled={isPending}
                aria-invalid={Boolean(errors.fueledAt)}
                {...form.register('fueledAt')}
              />
            </Field>

            <Field id="location" label="Mesto točenja" error={errors.location?.message}>
              <Input
                id="location"
                disabled={isPending}
                aria-invalid={Boolean(errors.location)}
                {...form.register('location')}
              />
            </Field>

            <Controller
              control={form.control}
              name="driverId"
              render={({ field }) => (
                <Field id="driverId" label="Vozač" error={errors.driverId?.message}>
                  <Select
                    value={field.value || NO_DRIVER}
                    onValueChange={(value) => field.onChange(value === NO_DRIVER ? '' : value)}
                    disabled={isPending || driversQuery.isPending}
                  >
                    <SelectTrigger id="driverId" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_DRIVER}>Bez vozača</SelectItem>
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

            <Field id="litersFilled" label="Točeno litara" error={errors.litersFilled?.message}>
              <Input
                id="litersFilled"
                type="number"
                step="0.01"
                inputMode="decimal"
                disabled={isPending}
                aria-invalid={Boolean(errors.litersFilled)}
                {...form.register('litersFilled', { valueAsNumber: true })}
              />
            </Field>

            <Field id="odometerKm" label="Stanje km" error={errors.odometerKm?.message}>
              <Input
                id="odometerKm"
                type="number"
                inputMode="numeric"
                disabled={isPending}
                aria-invalid={Boolean(errors.odometerKm)}
                {...form.register('odometerKm', { valueAsNumber: true })}
              />
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
              Otkaži
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Čuvanje…' : isEdit ? 'Sačuvaj izmene' : 'Dodaj točenje'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
