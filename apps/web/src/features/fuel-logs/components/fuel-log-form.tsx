'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  FUEL_LOG_FUEL_TYPE_LABELS,
  FUEL_LOG_FUEL_TYPES,
  type FuelLogCreateRequest,
  type FuelLogDto,
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
import { Textarea } from '@/components/ui/textarea';
import { useDrivers } from '@/features/drivers/hooks/use-drivers';
import { FuelSupplierField } from '@/features/fuel-logs/components/fuel-supplier-field';
import { useCreateFuelLog } from '@/features/fuel-logs/hooks/use-create-fuel-log';
import { useUpdateFuelLog } from '@/features/fuel-logs/hooks/use-update-fuel-log';
import {
  EMPTY_FUEL_LOG_FORM,
  fuelLogFormSchema,
  type FuelLogFormValues,
} from '@/features/fuel-logs/schemas/fuel-log-form-schema';
import { PaymentMethodSelect } from '@/features/transactions/components/payment-method-select';
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles';
import { vehicleLabel } from '@/features/vehicles/lib/vehicle';

interface FuelLogFormProps {
  fuelLog?: FuelLogDto;
  defaultVehicleId?: string;
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

export function FuelLogForm({ fuelLog, defaultVehicleId, onDone }: FuelLogFormProps) {
  const isEdit = Boolean(fuelLog);
  const createMutation = useCreateFuelLog();
  const updateMutation = useUpdateFuelLog();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const driversQuery = useDrivers({
    page: 1,
    limit: 100,
    sortBy: 'lastName',
    sortOrder: 'asc',
    status: 'ACTIVE',
  });
  const vehiclesQuery = useVehicles({
    page: 1,
    limit: 100,
    sortBy: 'make',
    sortOrder: 'asc',
  });
  const drivers = driversQuery.data?.drivers ?? [];
  const vehicles = vehiclesQuery.data?.vehicles ?? [];

  const form = useForm<FuelLogFormValues, unknown, FuelLogCreateRequest>({
    resolver: zodResolver(fuelLogFormSchema),
    defaultValues: fuelLog
      ? {
          vehicleId: fuelLog.vehicleId,
          fueledAt: fuelLog.fueledAt,
          location: fuelLog.location,
          driverId: fuelLog.driver?.id ?? '',
          fuelType: fuelLog.fuelType,
          litersFilled: fuelLog.litersFilled,
          odometerKm: fuelLog.odometerKm,
          cost: fuelLog.cost,
          paymentMethod: fuelLog.paymentMethod ?? '',
          supplier: fuelLog.supplier,
          note: fuelLog.note ?? '',
        }
      : { ...EMPTY_FUEL_LOG_FORM, vehicleId: defaultVehicleId ?? '' },
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
        <CardTitle>{isEdit ? 'Izmena sipanja' : 'Pojedinačan unos'}</CardTitle>
        <CardDescription>
          Pređeni km i potrošnja se automatski računaju po vozilu, u odnosu na prethodno stanje km.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <Field id="vehicleId" label="Vozilo" error={errors.vehicleId?.message}>
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                    disabled={isPending || vehiclesQuery.isPending}
                  >
                    <SelectTrigger id="vehicleId" className="w-full">
                      <SelectValue placeholder="Izaberite vozilo" />
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
              )}
            />

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

            <Field id="fueledAt" label="Datum sipanja" error={errors.fueledAt?.message}>
              <Controller
                control={form.control}
                name="fueledAt"
                render={({ field }) => (
                  <DateField
                    id="fueledAt"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isPending}
                    aria-invalid={Boolean(errors.fueledAt)}
                  />
                )}
              />
            </Field>

            <Controller
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FuelSupplierField
                  id="supplier"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isPending}
                  error={errors.supplier?.message}
                />
              )}
            />

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

            <Field id="litersFilled" label="Količina (L)" error={errors.litersFilled?.message}>
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

            <Field id="location" label="Mesto (opciono)" error={errors.location?.message}>
              <Input
                id="location"
                disabled={isPending}
                aria-invalid={Boolean(errors.location)}
                {...form.register('location')}
              />
            </Field>

            <Field id="cost" label="Iznos (RSD)" error={errors.cost?.message}>
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
                    allowEmpty
                  />
                </Field>
              )}
            />
          </div>

          <Field id="note" label="Napomena" error={errors.note?.message}>
            <Textarea id="note" disabled={isPending} rows={3} {...form.register('note')} />
          </Field>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
              Otkaži
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Čuvanje…' : isEdit ? 'Sačuvaj izmene' : 'Dodaj sipanje'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
