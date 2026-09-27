'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  MAX_TRIP_DRIVERS,
  MAX_TRIP_VEHICLES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  partnerSelectLabel,
  type EditTripSeriesInput,
  type EditTripSeriesRequest,
  type PaymentMethod,
  type TripDto,
  type TripSeriesDto,
  editTripSeriesSchema,
} from '@rental-admin/shared';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { MultiSelectField } from '@/components/common/multi-select-field';
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
import { usePartners } from '@/features/partners/hooks/use-partners';
import { useEditTripSeries } from '@/features/trips/hooks/use-edit-trip-series';
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles';
import { vehicleSelectLabel } from '@/features/vehicles/lib/vehicle';

const NONE = 'none';

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

const sharedDriverPay = (trip: TripDto): number | '' => {
  const amounts = trip.drivers
    .map((driver) => driver.perDiemAmount)
    .filter((amount): amount is number => amount != null);

  const first = amounts[0];
  if (first == null || amounts.length !== trip.drivers.length) {
    return '';
  }

  return amounts.every((amount) => amount === first) ? first : '';
};

const formValues = (series: TripSeriesDto, trip: TripDto): EditTripSeriesInput => ({
  name: series.name ?? '',
  origin: trip.origin,
  destination: trip.destination,
  country: trip.country ?? '',
  passengerCount: trip.passengerCount ?? '',
  partnerId: trip.partnerId ?? '',
  clientName: trip.clientName ?? '',
  notes: trip.notes ?? '',
  price: trip.price ?? '',
  paymentMethod: trip.paymentMethod ?? '',
  driverPay: sharedDriverPay(trip),
  vehicleCount: trip.vehicleCount,
  vehicleIds: trip.vehicles.map((vehicle) => vehicle.id),
  driverIds: trip.drivers.map((driver) => driver.id),
});

interface TripSeriesEditFormProps {
  series: TripSeriesDto;
  trip: TripDto;
  dayCount: number;
  vehiclesDiffer: boolean;
}

export function TripSeriesEditForm({
  series,
  trip,
  dayCount,
  vehiclesDiffer,
}: TripSeriesEditFormProps) {
  const mutation = useEditTripSeries(series.id);
  const [useFreeTextClient, setUseFreeTextClient] = useState(
    Boolean(trip.clientName) && !trip.partnerId,
  );

  const form = useForm<EditTripSeriesInput, unknown, EditTripSeriesRequest>({
    resolver: zodResolver(editTripSeriesSchema),
    defaultValues: formValues(series, trip),
  });

  const errors = form.formState.errors;
  const vehicleIds = useWatch({ control: form.control, name: 'vehicleIds' }) ?? [];
  const driverIds = useWatch({ control: form.control, name: 'driverIds' }) ?? [];

  const vehiclesQuery = useVehicles({
    page: 1,
    limit: 100,
    sortBy: 'licensePlate',
    sortOrder: 'asc',
  });
  const driversQuery = useDrivers({ page: 1, limit: 100, sortBy: 'lastName', sortOrder: 'asc' });
  const partnersQuery = usePartners({ page: 1, limit: 100, sortBy: 'type', sortOrder: 'asc' });

  const vehicleOptions = (vehiclesQuery.data?.vehicles ?? []).map((vehicle) => ({
    value: vehicle.id,
    label: vehicleSelectLabel(vehicle),
  }));
  const driverOptions = (driversQuery.data?.drivers ?? []).map((driver) => ({
    value: driver.id,
    label: `${driver.firstName} ${driver.lastName}`,
  }));
  const partners = partnersQuery.data?.partners ?? [];
  const isPending = mutation.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync(values);
  });

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Izmena cele serije</CardTitle>
        <CardDescription>
          Jedno čuvanje menja svih {dayCount} dana. Datum, faktura i obračun svakog dana ostaju.
          Cena se ne menja na danima koji su već fakturisani ili plaćeni.
          {vehiclesDiffer
            ? ' Dani trenutno nemaju ista vozila — čuvanje stavlja vozila iz ove forme na sve dane.'
            : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="series-name" label="Naziv" error={errors.name?.message as string | undefined}>
              <Input id="series-name" disabled={isPending} {...form.register('name')} />
            </Field>
            <Field
              id="series-country"
              label="Država"
              error={errors.country?.message as string | undefined}
            >
              <Input
                id="series-country"
                placeholder="npr. Srbija"
                disabled={isPending}
                {...form.register('country')}
              />
            </Field>
            <Field
              id="series-origin"
              label="Polazište"
              error={errors.origin?.message as string | undefined}
            >
              <Input id="series-origin" disabled={isPending} {...form.register('origin')} />
            </Field>
            <Field
              id="series-destination"
              label="Odredište"
              error={errors.destination?.message as string | undefined}
            >
              <Input
                id="series-destination"
                disabled={isPending}
                {...form.register('destination')}
              />
            </Field>
            <Field
              id="series-passengers"
              label="Broj putnika"
              error={errors.passengerCount?.message as string | undefined}
            >
              <Input
                id="series-passengers"
                type="number"
                inputMode="numeric"
                min={1}
                disabled={isPending}
                {...form.register('passengerCount', { valueAsNumber: true })}
              />
            </Field>
            <Field id="series-price" label="Cena" error={errors.price?.message as string | undefined}>
              <Input
                id="series-price"
                type="number"
                inputMode="decimal"
                step="0.01"
                disabled={isPending}
                {...form.register('price', { valueAsNumber: true })}
              />
            </Field>
          </div>

          <Controller
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <Field
                id="series-payment"
                label="Način plaćanja"
                error={errors.paymentMethod?.message as string | undefined}
              >
                <Select
                  value={field.value || NONE}
                  onValueChange={(value) =>
                    field.onChange(value === NONE ? '' : (value as PaymentMethod))
                  }
                  disabled={isPending}
                >
                  <SelectTrigger id="series-payment" className="w-full">
                    <SelectValue placeholder="Nije uneto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nije uneto</SelectItem>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {PAYMENT_METHOD_LABELS[method]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />

          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={useFreeTextClient ? 'outline' : 'default'}
                disabled={isPending}
                onClick={() => {
                  setUseFreeTextClient(false);
                  form.setValue('clientName', '');
                }}
              >
                Partner iz evidencije
              </Button>
              <Button
                type="button"
                size="sm"
                variant={useFreeTextClient ? 'default' : 'outline'}
                disabled={isPending}
                onClick={() => {
                  setUseFreeTextClient(true);
                  form.setValue('partnerId', '');
                }}
              >
                Slobodan unos
              </Button>
            </div>
            {useFreeTextClient ? (
              <Field
                id="series-client"
                label="Naziv / ime naručioca"
                error={errors.clientName?.message as string | undefined}
              >
                <Input id="series-client" disabled={isPending} {...form.register('clientName')} />
              </Field>
            ) : (
              <Controller
                control={form.control}
                name="partnerId"
                render={({ field }) => (
                  <Field
                    id="series-partner"
                    label="Partner"
                    error={errors.partnerId?.message as string | undefined}
                  >
                    <Select
                      value={field.value || NONE}
                      onValueChange={(value) => field.onChange(value === NONE ? '' : value)}
                      disabled={isPending || partnersQuery.isPending}
                    >
                      <SelectTrigger id="series-partner" className="w-full">
                        <SelectValue placeholder="Izaberite partnera" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Nije izabran</SelectItem>
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
            )}
          </div>

          <Field
            id="series-vehicle-count"
            label="Broj vozila"
            error={errors.vehicleCount?.message as string | undefined}
          >
            <Input
              id="series-vehicle-count"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_TRIP_VEHICLES}
              disabled={isPending}
              {...form.register('vehicleCount', { valueAsNumber: true })}
            />
          </Field>
          <Field
            id="series-vehicles"
            label="Vozila"
            error={errors.vehicleIds?.message as string | undefined}
          >
            <MultiSelectField
              options={vehicleOptions}
              selected={vehicleIds}
              onChange={(next) => {
                form.setValue('vehicleIds', next);
                const currentCount = form.getValues('vehicleCount');
                const numericCount =
                  typeof currentCount === 'number' && !Number.isNaN(currentCount) ? currentCount : 1;
                if (numericCount < next.length) {
                  form.setValue('vehicleCount', next.length);
                }
              }}
              disabled={isPending || vehiclesQuery.isPending}
              emptyLabel="Nema unetih vozila."
              maxSelected={MAX_TRIP_VEHICLES}
            />
          </Field>
          <Field
            id="series-drivers"
            label="Vozači"
            error={errors.driverIds?.message as string | undefined}
          >
            <MultiSelectField
              options={driverOptions}
              selected={driverIds}
              onChange={(next) => form.setValue('driverIds', next)}
              disabled={isPending || driversQuery.isPending}
              emptyLabel="Nema unetih vozača."
              maxSelected={MAX_TRIP_DRIVERS}
            />
          </Field>
          <Field
            id="series-driver-pay"
            label="Plaćeno vozaču, po danu (RSD)"
            error={errors.driverPay?.message as string | undefined}
          >
            <Input
              id="series-driver-pay"
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="npr. 6000"
              disabled={isPending}
              {...form.register('driverPay', { valueAsNumber: true })}
            />
            <p className="text-muted-foreground text-xs">
              Isti iznos ide svakom vozaču, na svaki dan. Prazno polje ne menja već upisane iznose.
            </p>
          </Field>
          <Field id="series-notes" label="Napomena" error={errors.notes?.message as string | undefined}>
            <Textarea id="series-notes" rows={3} disabled={isPending} {...form.register('notes')} />
          </Field>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Čuvanje…' : 'Sačuvaj za sve dane'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
