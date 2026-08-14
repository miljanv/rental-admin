'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  TACHOGRAPH_TYPE_LABELS,
  TACHOGRAPH_TYPES,
  VEHICLE_FUEL_TYPE_LABELS,
  VEHICLE_FUEL_TYPES,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUSES,
  VEHICLE_TYPE_LABELS,
  VEHICLE_TYPES,
  type VehicleDto,
} from '@rental-admin/shared';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';

import { PageHeader } from '@/components/common/page-header';
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
import { useCreateVehicle } from '@/features/vehicles/hooks/use-create-vehicle';
import { useUpdateVehicle } from '@/features/vehicles/hooks/use-update-vehicle';
import { toVehicleFormValues } from '@/features/vehicles/lib/vehicle';
import {
  EMPTY_VEHICLE_FORM,
  vehicleFormSchema,
  type VehicleFormValues,
} from '@/features/vehicles/schemas/vehicle-form-schema';

interface VehicleFormProps {
  vehicle?: VehicleDto;
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

export function VehicleForm({ vehicle }: VehicleFormProps) {
  const isEdit = Boolean(vehicle);
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle(vehicle?.id ?? '');
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: vehicle ? toVehicleFormValues(vehicle) : EMPTY_VEHICLE_FORM,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEdit) {
      await updateMutation.mutateAsync(values);
      return;
    }

    await createMutation.mutateAsync(values);
  });

  const errors = form.formState.errors;
  const cancelHref = vehicle ? `/vehicles/${vehicle.id}` : '/vehicles';

  return (
    <>
      <PageHeader
        title={isEdit ? 'Izmena vozila' : 'Novo vozilo'}
        description={
          isEdit
            ? 'Ažurirajte osnovne podatke i status vozila.'
            : 'Unesite osnovne podatke vozila u evidenciju.'
        }
      />

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Osnovni podaci</CardTitle>
            <CardDescription>Marka, model i identifikacija vozila.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="make" label="Marka" error={errors.make?.message}>
              <Input
                id="make"
                disabled={isPending}
                aria-invalid={Boolean(errors.make)}
                {...form.register('make')}
              />
            </Field>
            <Field id="model" label="Model" error={errors.model?.message}>
              <Input
                id="model"
                disabled={isPending}
                aria-invalid={Boolean(errors.model)}
                {...form.register('model')}
              />
            </Field>
            <Field id="year" label="Godište" error={errors.year?.message}>
              <Input
                id="year"
                type="number"
                inputMode="numeric"
                disabled={isPending}
                aria-invalid={Boolean(errors.year)}
                {...form.register('year', { valueAsNumber: true })}
              />
            </Field>
            <Field id="licensePlate" label="Registarske tablice" error={errors.licensePlate?.message}>
              <Input
                id="licensePlate"
                disabled={isPending}
                aria-invalid={Boolean(errors.licensePlate)}
                {...form.register('licensePlate')}
              />
            </Field>
            <Field id="vin" label="VIN" error={errors.vin?.message}>
              <Input
                id="vin"
                disabled={isPending}
                aria-invalid={Boolean(errors.vin)}
                {...form.register('vin')}
              />
            </Field>
            <Field id="seatCount" label="Broj sedišta" error={errors.seatCount?.message}>
              <Input
                id="seatCount"
                type="number"
                inputMode="numeric"
                disabled={isPending}
                aria-invalid={Boolean(errors.seatCount)}
                {...form.register('seatCount', { valueAsNumber: true })}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Tip i oprema</CardTitle>
            <CardDescription>Tip vozila, gorivo i tahograf.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Field id="type" label="Tip vozila" error={errors.type?.message}>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <SelectTrigger id="type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {VEHICLE_TYPE_LABELS[type]}
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
                      {VEHICLE_FUEL_TYPES.map((fuelType) => (
                        <SelectItem key={fuelType} value={fuelType}>
                          {VEHICLE_FUEL_TYPE_LABELS[fuelType]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="tachographType"
              render={({ field }) => (
                <Field
                  id="tachographType"
                  label="Tip tahografa"
                  error={errors.tachographType?.message}
                >
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <SelectTrigger id="tachographType" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TACHOGRAPH_TYPES.map((tachographType) => (
                        <SelectItem key={tachographType} value={tachographType}>
                          {TACHOGRAPH_TYPE_LABELS[tachographType]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Status i kilometraža</CardTitle>
            <CardDescription>Trenutno stanje vozila.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="currentMileage" label="Trenutna kilometraža" error={errors.currentMileage?.message}>
              <Input
                id="currentMileage"
                type="number"
                inputMode="numeric"
                disabled={isPending}
                aria-invalid={Boolean(errors.currentMileage)}
                {...form.register('currentMileage', { valueAsNumber: true })}
              />
            </Field>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Field id="status" label="Status" error={errors.status?.message}>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {VEHICLE_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" asChild>
            <Link href={cancelHref}>Otkaži</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Čuvanje…' : isEdit ? 'Sačuvaj izmene' : 'Dodaj vozilo'}
          </Button>
        </div>
      </form>
    </>
  );
}
