'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  CONTRACT_STATUS_LABELS,
  contractRouteLabel,
  MAX_TRIP_DRIVERS,
  MAX_TRIP_VEHICLES,
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
import { ExistingPartnerHint } from '@/features/partners/components/existing-partner-hint';
import { PartnerNameInput } from '@/features/partners/components/partner-name-input';
import {
  findPartnerByName,
  partnerPickerLabel,
  sortPartnersForPicker,
} from '@/features/partners/lib/partner';
import { useCreateTrip } from '@/features/trips/hooks/use-create-trip';
import { useUpdateTrip } from '@/features/trips/hooks/use-update-trip';
import { toTripFormValues } from '@/features/trips/lib/trip';
import { revealTripFormErrors } from '@/features/trips/lib/trip-form-errors';
import {
  EMPTY_TRIP_FORM,
  tripFormSchema,
  type TripFormValues,
} from '@/features/trips/schemas/trip-form-schema';
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles';
import { selectableVehicles, vehicleSelectLabel } from '@/features/vehicles/lib/vehicle';
import { sortAlphabetically } from '@/lib/sort-options';

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
  const [useFreeTextClient, setUseFreeTextClient] = useState(() =>
    Boolean(trip && !trip.partnerId),
  );

  const form = useForm<TripFormValues, unknown, TripWriteRequest>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: trip ? toTripFormValues(trip) : EMPTY_TRIP_FORM,
  });

  const errors = form.formState.errors;
  const vehicleIds = useWatch({ control: form.control, name: 'vehicleIds' }) ?? [];
  const driverIds = useWatch({ control: form.control, name: 'driverIds' }) ?? [];
  const clientName = useWatch({ control: form.control, name: 'clientName' });
  const departureDate = useWatch({ control: form.control, name: 'departureDate' });

  const vehiclesQuery = useVehicles({
    page: 1,
    limit: 100,
    sortBy: 'licensePlate',
    sortOrder: 'asc',
  });
  const driversQuery = useDrivers({ page: 1, limit: 100, sortBy: 'lastName', sortOrder: 'asc' });
  const partnersQuery = usePartners({ page: 1, limit: 100, sortBy: 'type', sortOrder: 'asc' });
  const contractsQuery = useContracts({
    page: 1,
    limit: 100,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const vehicleOptions = sortAlphabetically(
    selectableVehicles(
      vehiclesQuery.data?.vehicles ?? [],
      trip?.vehicles.map((vehicle) => vehicle.id),
    ),
    (vehicle) => vehicle.licensePlate,
  ).map((vehicle) => ({
    value: vehicle.id,
    label: vehicleSelectLabel(vehicle),
  }));
  const driverOptions = sortAlphabetically(
    driversQuery.data?.drivers ?? [],
    (driver) => `${driver.firstName} ${driver.lastName}`,
  ).map((driver) => ({
    value: driver.id,
    label: `${driver.firstName} ${driver.lastName}`,
  }));
  const partners = sortPartnersForPicker(partnersQuery.data?.partners ?? []);
  const contracts = contractsQuery.data?.contracts ?? [];
  const matchedPartner = useFreeTextClient ? findPartnerByName(partners, clientName) : undefined;

  const linkPartner = (partnerId: string): void => {
    setUseFreeTextClient(false);
    form.setValue('clientName', '');
    form.setValue('partnerId', partnerId, { shouldDirty: true });
  };

  const onSubmit = form.handleSubmit(
    async (values) => {
      // A typed name that matches a registered partner is saved as that partner,
      // otherwise reports would show the same client twice.
      const match = useFreeTextClient ? findPartnerByName(partners, values.clientName) : undefined;
      const payload = match ? { ...values, partnerId: match.id, clientName: null } : values;

      if (isEdit) {
        await updateMutation.mutateAsync(payload);
        return;
      }

      await createMutation.mutateAsync(payload);
    },
    (errors) => revealTripFormErrors(errors),
  );

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
            <CardTitle>Naručilac</CardTitle>
            <CardDescription>
              Registrovan partner ili slobodan unos imena — birajte prvo, ostala polja se
              popunjavaju na osnovu izabranog ugovora.
            </CardDescription>
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
              <Field
                id="clientName"
                label="Naziv / ime naručioca"
                error={errors.clientName?.message}
              >
                <Controller
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <PartnerNameInput
                      id="clientName"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      disabled={isPending}
                      ariaInvalid={Boolean(errors.clientName)}
                    />
                  )}
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
                            {partnerPickerLabel(partner)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            )}

            {matchedPartner ? (
              <ExistingPartnerHint
                partner={matchedPartner}
                onLink={() => linkPartner(matchedPartner.id)}
                disabled={isPending}
              />
            ) : null}

            <Controller
              control={form.control}
              name="contractId"
              render={({ field }) => (
                <Field
                  id="contractId"
                  label="Povezan ugovor (opciono)"
                  error={errors.contractId?.message}
                >
                  <Select
                    value={field.value || NONE}
                    onValueChange={(value) => {
                      field.onChange(value === NONE ? '' : value);

                      const contract = contracts.find((candidate) => candidate.id === value);

                      if (!contract) {
                        return;
                      }

                      // Linking a contract seeds the trip's other fields from it — a
                      // starting point, not a live-bound value, since one contract can
                      // cover several trip legs (e.g. a multi-leg tour) and its totals
                      // shouldn't get copied onto every single leg blindly. Only fills
                      // fields the user hasn't already touched.
                      const currentPrice = form.getValues('price');
                      if (
                        currentPrice === '' ||
                        currentPrice == null ||
                        Number.isNaN(currentPrice)
                      ) {
                        form.setValue('price', contract.price, { shouldDirty: true });
                      }

                      const currentPassengerCount = form.getValues('passengerCount');
                      if (
                        currentPassengerCount === '' ||
                        currentPassengerCount == null ||
                        Number.isNaN(currentPassengerCount)
                      ) {
                        form.setValue('passengerCount', contract.passengerCount, {
                          shouldDirty: true,
                        });
                      }

                      const currentPartnerId = form.getValues('partnerId');
                      const currentClientName = form.getValues('clientName');
                      if (contract.partnerId && !currentPartnerId && !currentClientName) {
                        setUseFreeTextClient(false);
                        form.setValue('partnerId', contract.partnerId, { shouldDirty: true });
                      }

                      const currentVehicleIds = form.getValues('vehicleIds') ?? [];
                      if (contract.vehicleId && currentVehicleIds.length === 0) {
                        form.setValue('vehicleIds', [contract.vehicleId], { shouldDirty: true });
                      }

                      const currentDriverIds = form.getValues('driverIds') ?? [];
                      if (contract.driverId && currentDriverIds.length === 0) {
                        form.setValue('driverIds', [contract.driverId], { shouldDirty: true });
                      }

                      if (!form.getValues('origin')) {
                        form.setValue('origin', contract.origin, { shouldDirty: true });
                      }

                      if (!form.getValues('destination')) {
                        form.setValue('destination', contract.destination, { shouldDirty: true });
                      }

                      if (!form.getValues('departureDate')) {
                        form.setValue('departureDate', contract.serviceStartDate, {
                          shouldDirty: true,
                        });
                      }

                      if (!form.getValues('returnDate')) {
                        form.setValue('returnDate', contract.serviceEndDate, { shouldDirty: true });
                      }
                    }}
                    disabled={isPending || contractsQuery.isPending}
                  >
                    <SelectTrigger id="contractId" className="w-full">
                      <SelectValue placeholder="Nije povezano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Nije povezano</SelectItem>
                      {contracts.map((contract) => (
                        <SelectItem key={contract.id} value={contract.id}>
                          {contractRouteLabel(contract)} — {CONTRACT_STATUS_LABELS[contract.status]}
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
            <CardTitle>Osnovni podaci</CardTitle>
            <CardDescription>
              Period, relacija i broj putnika. RN broj se dodeljuje naknadno.
            </CardDescription>
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
                    onChange={(value) => {
                      const previousDeparture = field.value;
                      const currentReturn = form.getValues('returnDate');
                      field.onChange(value);
                      // Same-day return is the default; keep a later zaključni dan
                      // if the user already moved it off the previous departure, but
                      // never leave it before the new departure.
                      if (
                        !currentReturn ||
                        currentReturn === previousDeparture ||
                        (value && currentReturn < value)
                      ) {
                        form.setValue('returnDate', value, {
                          shouldDirty: true,
                          shouldValidate: form.formState.isSubmitted,
                        });
                      }
                    }}
                    disabled={isPending}
                    aria-invalid={Boolean(errors.departureDate)}
                  />
                )}
              />
            </Field>
            <div className="space-y-1.5">
              <Field
                id="returnDate"
                label="Zaključni dan / povratak"
                error={errors.returnDate?.message}
              >
                <Controller
                  control={form.control}
                  name="returnDate"
                  render={({ field }) => (
                    <DateField
                      id="returnDate"
                      value={field.value ?? ''}
                      onChange={(value) => {
                        field.onChange(value);
                        // Show "povratak pre polaska" right away, not only on save.
                        void form.trigger('returnDate');
                      }}
                      min={departureDate}
                      disabled={isPending}
                      aria-invalid={Boolean(errors.returnDate)}
                    />
                  )}
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto px-0 text-xs"
                disabled={isPending}
                onClick={() => {
                  const departure = form.getValues('departureDate');
                  if (departure) {
                    form.setValue('returnDate', departure, { shouldDirty: true });
                  }
                }}
              >
                Isti dan kao polazak
              </Button>
            </div>
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
            <CardTitle>Vozila i vozači</CardTitle>
            <CardDescription>
              Unesite koliko vozila radi na ovoj vožnji (npr. Expo — 3 autobusa na istoj relaciji),
              pa po želji izaberite tablice. Do {MAX_TRIP_DRIVERS} vozača.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              id="vehicleCount"
              label="Broj vozila"
              error={errors.vehicleCount?.message as string | undefined}
            >
              <Input
                id="vehicleCount"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_TRIP_VEHICLES}
                disabled={isPending}
                aria-invalid={Boolean(errors.vehicleCount)}
                {...form.register('vehicleCount', { valueAsNumber: true })}
              />
            </Field>
            <Field
              id="vehicleIds"
              label="Tablice (opciono)"
              error={errors.vehicleIds?.message as string | undefined}
            >
              <MultiSelectField
                options={vehicleOptions}
                selected={vehicleIds}
                onChange={(next) => {
                  form.setValue('vehicleIds', next);
                  const currentCount = form.getValues('vehicleCount');
                  const numericCount =
                    typeof currentCount === 'number' && !Number.isNaN(currentCount)
                      ? currentCount
                      : 1;
                  if (numericCount < next.length) {
                    form.setValue('vehicleCount', next.length, { shouldDirty: true });
                  }
                }}
                disabled={isPending || vehiclesQuery.isPending}
                emptyLabel="Nema unetih vozila."
                maxSelected={MAX_TRIP_VEHICLES}
              />
            </Field>
            <Field
              id="driverIds"
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
          </CardContent>
        </Card>

        {isEdit ? (
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Realizacija vožnje</CardTitle>
              <CardDescription>
                Status, završna kilometraža i interna napomena. Cena i način plaćanja unose se kroz
                fakturisanje na detaljima vožnje.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field
                id="distanceKm"
                label="Pređeni km (opciono)"
                error={errors.distanceKm?.message as string | undefined}
              >
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
                  <Field id="status" label="Status vožnje" error={errors.status?.message}>
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
                <Field
                  id="notes"
                  label="Napomena"
                  error={errors.notes?.message as string | undefined}
                >
                  <Textarea id="notes" rows={3} disabled={isPending} {...form.register('notes')} />
                </Field>
              </div>
            </CardContent>
          </Card>
        ) : null}

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
