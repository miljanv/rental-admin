'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  CONTRACT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  partnerSelectLabel,
  TRIP_STATUS_LABELS,
  TRIP_STATUSES,
  type TripDto,
  type TripWriteRequest,
} from '@rental-admin/shared';
import Link from 'next/link';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { DateField } from '@/components/common/date-field';
import { MultiSelectField } from '@/components/common/multi-select-field';
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
import { Textarea } from '@/components/ui/textarea';
import { useContracts } from '@/features/contracts/hooks/use-contracts';
import { useDrivers } from '@/features/drivers/hooks/use-drivers';
import { usePartners } from '@/features/partners/hooks/use-partners';
import { useCreateTrip } from '@/features/trips/hooks/use-create-trip';
import { useUpdateTrip } from '@/features/trips/hooks/use-update-trip';
import { toTripFormValues } from '@/features/trips/lib/trip';
import {
  EMPTY_TRIP_FORM,
  tripFormSchema,
  type TripFormValues,
} from '@/features/trips/schemas/trip-form-schema';
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles';

interface TripFormProps {
  trip?: TripDto;
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

export function TripForm({ trip }: TripFormProps) {
  const isEdit = Boolean(trip);
  const createMutation = useCreateTrip();
  const updateMutation = useUpdateTrip(trip?.id ?? '');
  const isPending = createMutation.isPending || updateMutation.isPending;
  const [useFreeTextClient, setUseFreeTextClient] = useState(() => Boolean(trip && !trip.partnerId));

  const form = useForm<TripFormValues, unknown, TripWriteRequest>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: trip ? toTripFormValues(trip) : EMPTY_TRIP_FORM,
  });

  const errors = form.formState.errors;
  const vehicleIds = useWatch({ control: form.control, name: 'vehicleIds' }) ?? [];
  const driverIds = useWatch({ control: form.control, name: 'driverIds' }) ?? [];

  const vehiclesQuery = useVehicles({ page: 1, limit: 100, sortBy: 'make', sortOrder: 'asc' });
  const driversQuery = useDrivers({ page: 1, limit: 100, sortBy: 'lastName', sortOrder: 'asc' });
  const partnersQuery = usePartners({ page: 1, limit: 100, sortBy: 'type', sortOrder: 'asc' });
  const contractsQuery = useContracts({ page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' });

  const vehicleOptions = (vehiclesQuery.data?.vehicles ?? []).map((vehicle) => ({
    value: vehicle.id,
    label: `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`,
  }));
  const driverOptions = (driversQuery.data?.drivers ?? []).map((driver) => ({
    value: driver.id,
    label: `${driver.firstName} ${driver.lastName}`,
  }));
  const partners = partnersQuery.data?.partners ?? [];
  const contracts = contractsQuery.data?.contracts ?? [];

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEdit) {
      await updateMutation.mutateAsync(values);
      return;
    }

    await createMutation.mutateAsync(values);
  });

  const cancelHref = trip ? `/trips/${trip.id}` : '/trips';

  return (
    <>
      <PageHeader
        title={isEdit ? 'Izmena vožnje' : 'Nova vožnja'}
        description={
          isEdit
            ? 'Ažurirajte podatke vožnje, vozila i vozače.'
            : 'Unesite podatke pojedinačne vožnje. Za ponavljajuću vožnju koristite kreiranje serije.'
        }
      />

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Osnovni podaci</CardTitle>
            <CardDescription>Period, relacija i broj putnika. RN broj se dodeljuje naknadno.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field
              id="referenceNumber"
              label="RN broj (opciono)"
              error={errors.referenceNumber?.message}
            >
              <Input
                id="referenceNumber"
                placeholder="Dodeljuje se pri fakturisanju"
                disabled={isPending}
                aria-invalid={Boolean(errors.referenceNumber)}
                {...form.register('referenceNumber')}
              />
            </Field>
            <Field id="country" label="Država" error={errors.country?.message}>
              <Input
                id="country"
                placeholder="npr. Srbija"
                disabled={isPending}
                aria-invalid={Boolean(errors.country)}
                {...form.register('country')}
              />
            </Field>
            <Field id="departureDate" label="Datum polaska" error={errors.departureDate?.message}>
              <Controller
                control={form.control}
                name="departureDate"
                render={({ field }) => (
                  <DateField
                    id="departureDate"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isPending}
                    aria-invalid={Boolean(errors.departureDate)}
                  />
                )}
              />
            </Field>
            <Field id="returnDate" label="Datum povratka" error={errors.returnDate?.message}>
              <Controller
                control={form.control}
                name="returnDate"
                render={({ field }) => (
                  <DateField
                    id="returnDate"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    disabled={isPending}
                    aria-invalid={Boolean(errors.returnDate)}
                  />
                )}
              />
            </Field>
            <Field
              id="passengerCount"
              label="Broj putnika (opciono)"
              error={errors.passengerCount?.message as string | undefined}
            >
              <Input
                id="passengerCount"
                type="number"
                inputMode="numeric"
                min={1}
                disabled={isPending}
                aria-invalid={Boolean(errors.passengerCount)}
                {...form.register('passengerCount', { valueAsNumber: true })}
              />
            </Field>
            <Field id="origin" label="Polazište" error={errors.origin?.message}>
              <Input
                id="origin"
                placeholder="npr. Novi Sad"
                disabled={isPending}
                aria-invalid={Boolean(errors.origin)}
                {...form.register('origin')}
              />
            </Field>
            <Field id="destination" label="Odredište" error={errors.destination?.message}>
              <Input
                id="destination"
                placeholder="npr. Zlatibor"
                disabled={isPending}
                aria-invalid={Boolean(errors.destination)}
                {...form.register('destination')}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Naručilac</CardTitle>
            <CardDescription>Registrovan partner ili slobodan unos imena.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={useFreeTextClient ? 'outline' : 'default'}
                onClick={() => {
                  setUseFreeTextClient(false);
                  form.setValue('clientName', '');
                }}
                disabled={isPending}
              >
                Partner iz evidencije
              </Button>
              <Button
                type="button"
                size="sm"
                variant={useFreeTextClient ? 'default' : 'outline'}
                onClick={() => {
                  setUseFreeTextClient(true);
                  form.setValue('partnerId', '');
                }}
                disabled={isPending}
              >
                Slobodan unos
              </Button>
            </div>

            {useFreeTextClient ? (
              <Field id="clientName" label="Naziv / ime naručioca" error={errors.clientName?.message}>
                <Input
                  id="clientName"
                  disabled={isPending}
                  aria-invalid={Boolean(errors.clientName)}
                  {...form.register('clientName')}
                />
              </Field>
            ) : (
              <Controller
                control={form.control}
                name="partnerId"
                render={({ field }) => (
                  <Field id="partnerId" label="Partner" error={errors.partnerId?.message}>
                    <Select
                      value={field.value || NONE}
                      onValueChange={(value) => field.onChange(value === NONE ? '' : value)}
                      disabled={isPending || partnersQuery.isPending}
                    >
                      <SelectTrigger id="partnerId" className="w-full">
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

            <Controller
              control={form.control}
              name="contractId"
              render={({ field }) => (
                <Field id="contractId" label="Povezan ugovor (opciono)" error={errors.contractId?.message}>
                  <Select
                    value={field.value || NONE}
                    onValueChange={(value) => field.onChange(value === NONE ? '' : value)}
                    disabled={isPending || contractsQuery.isPending}
                  >
                    <SelectTrigger id="contractId" className="w-full">
                      <SelectValue placeholder="Nije povezano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Nije povezano</SelectItem>
                      {contracts.map((contract) => (
                        <SelectItem key={contract.id} value={contract.id}>
                          {contract.route} — {CONTRACT_STATUS_LABELS[contract.status]}
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
            <CardTitle>Vozila i vozači</CardTitle>
            <CardDescription>
              Moguće je izabrati više vozila i više vozača na istoj vožnji (npr. grupni izlet ili smena).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field id="vehicleIds" label="Vozila" error={errors.vehicleIds?.message as string | undefined}>
              <MultiSelectField
                options={vehicleOptions}
                selected={vehicleIds}
                onChange={(next) => form.setValue('vehicleIds', next)}
                disabled={isPending || vehiclesQuery.isPending}
                emptyLabel="Nema unetih vozila."
              />
            </Field>
            <Field id="driverIds" label="Vozači" error={errors.driverIds?.message as string | undefined}>
              <MultiSelectField
                options={driverOptions}
                selected={driverIds}
                onChange={(next) => form.setValue('driverIds', next)}
                disabled={isPending || driversQuery.isPending}
                emptyLabel="Nema unetih vozača."
              />
            </Field>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Cena, plaćanje i status</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="price" label="Cena (RSD)" error={errors.price?.message as string | undefined}>
              <Input
                id="price"
                type="number"
                inputMode="decimal"
                step="0.01"
                disabled={isPending}
                {...form.register('price', { valueAsNumber: true })}
              />
            </Field>
            <Controller
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <Field id="paymentMethod" label="Način plaćanja" error={errors.paymentMethod?.message}>
                  <Select
                    value={field.value || NONE}
                    onValueChange={(value) => field.onChange(value === NONE ? '' : value)}
                    disabled={isPending}
                  >
                    <SelectTrigger id="paymentMethod" className="w-full">
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
            <Field id="distanceKm" label="Pređeni km (opciono)" error={errors.distanceKm?.message as string | undefined}>
              <Input
                id="distanceKm"
                type="number"
                inputMode="decimal"
                step="0.1"
                disabled={isPending}
                {...form.register('distanceKm', { valueAsNumber: true })}
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
                      {TRIP_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {TRIP_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <div className="sm:col-span-2">
              <Field id="notes" label="Napomena" error={errors.notes?.message as string | undefined}>
                <Textarea id="notes" rows={3} disabled={isPending} {...form.register('notes')} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" asChild>
            <Link href={cancelHref}>Otkaži</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Čuvanje…' : isEdit ? 'Sačuvaj izmene' : 'Kreiraj vožnju'}
          </Button>
        </div>
      </form>
    </>
  );
}
