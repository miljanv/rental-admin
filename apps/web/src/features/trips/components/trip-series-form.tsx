'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  CONTRACT_STATUS_LABELS,
  contractRouteLabel,
  MAX_TRIP_DRIVERS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  partnerSelectLabel,
  TRIP_SERIES_FREQUENCY_LABELS,
  TRIP_SERIES_FREQUENCIES,
  TRIP_STATUS_LABELS,
  TRIP_STATUSES,
  WEEKDAYS,
  WEEKDAY_SHORT_LABELS,
  type GenerateTripSeriesRequest,
} from '@rental-admin/shared';
import { Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';

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
import { useGenerateTripSeries } from '@/features/trips/hooks/use-generate-trip-series';
import {
  EMPTY_TRIP_SERIES_FORM,
  tripSeriesFormSchema,
  type TripSeriesFormValues,
} from '@/features/trips/schemas/trip-series-form-schema';
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles';
import { vehicleSelectLabel } from '@/features/vehicles/lib/vehicle';
import { cn } from '@/lib/utils';

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

/** Same field groups as the single-trip form, plus a "ponavljanje" (repeat rule) section. */
export function TripSeriesForm() {
  const generateMutation = useGenerateTripSeries();
  const [useFreeTextClient, setUseFreeTextClient] = useState(false);

  const form = useForm<TripSeriesFormValues, unknown, GenerateTripSeriesRequest>({
    resolver: zodResolver(tripSeriesFormSchema),
    defaultValues: EMPTY_TRIP_SERIES_FORM,
  });

  const errors = form.formState.errors;
  const pauseFields = useFieldArray({ control: form.control, name: 'pauses' });
  const frequency = useWatch({ control: form.control, name: 'frequency' });
  const daysOfWeek = useWatch({ control: form.control, name: 'daysOfWeek' }) ?? [];
  const vehicleIds = useWatch({ control: form.control, name: 'vehicleIds' }) ?? [];
  const driverIds = useWatch({ control: form.control, name: 'driverIds' }) ?? [];

  const vehiclesQuery = useVehicles({ page: 1, limit: 100, sortBy: 'licensePlate', sortOrder: 'asc' });
  const driversQuery = useDrivers({ page: 1, limit: 100, sortBy: 'lastName', sortOrder: 'asc' });
  const partnersQuery = usePartners({ page: 1, limit: 100, sortBy: 'type', sortOrder: 'asc' });
  const contractsQuery = useContracts({ page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' });

  const vehicleOptions = (vehiclesQuery.data?.vehicles ?? []).map((vehicle) => ({
    value: vehicle.id,
    label: vehicleSelectLabel(vehicle),
  }));
  const driverOptions = (driversQuery.data?.drivers ?? []).map((driver) => ({
    value: driver.id,
    label: `${driver.firstName} ${driver.lastName}`,
  }));
  const partners = partnersQuery.data?.partners ?? [];
  const contracts = contractsQuery.data?.contracts ?? [];

  const toggleWeekday = (day: number) => {
    const next = daysOfWeek.includes(day)
      ? daysOfWeek.filter((value) => value !== day)
      : [...daysOfWeek, day].sort((a, b) => a - b);
    form.setValue('daysOfWeek', next);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    await generateMutation.mutateAsync(values);
  });

  const isPending = generateMutation.isPending;

  return (
    <>
      <PageHeader
        title="Ponavljajuća vožnja"
        description="Definišite pravilo ponavljanja — generiše se posebna vožnja za svaki dan koji odgovara pravilu."
      />

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Ponavljanje</CardTitle>
            <CardDescription>Period i učestalost generisanja.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="name" label="Naziv serije (opciono)" error={errors.name?.message as string | undefined}>
              <Input
                id="name"
                placeholder="npr. Čoka - OŠ Čoka"
                disabled={isPending}
                {...form.register('name')}
              />
            </Field>
            <Controller
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <Field id="frequency" label="Učestalost" error={errors.frequency?.message}>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <SelectTrigger id="frequency" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIP_SERIES_FREQUENCIES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {TRIP_SERIES_FREQUENCY_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Field id="startDate" label="Datum početka" error={errors.startDate?.message}>
              <Controller
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <DateField
                    id="startDate"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isPending}
                  />
                )}
              />
            </Field>
            <Field id="endDate" label="Datum završetka" error={errors.endDate?.message}>
              <Controller
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <DateField
                    id="endDate"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isPending}
                  />
                )}
              />
            </Field>

            {frequency === 'WEEKLY' ? (
              <div className="sm:col-span-2">
                <Field
                  id="daysOfWeek"
                  label="Dani u nedelji"
                  error={errors.daysOfWeek?.message as string | undefined}
                >
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWeekday(day)}
                        disabled={isPending}
                        className={cn(
                          'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                          daysOfWeek.includes(day)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {WEEKDAY_SHORT_LABELS[day]}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Pauze (opciono)</CardTitle>
            <CardDescription>
              Dani u ovom periodu koji se preskaču pri generisanju — npr. kolektivni godišnji odmor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pauseFields.fields.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nema dodatih pauza.</p>
            ) : (
              pauseFields.fields.map((field, index) => (
                <div key={field.id} className="grid gap-4 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <Field
                    id={`pauses.${index}.startDate`}
                    label="Od"
                    error={errors.pauses?.[index]?.startDate?.message}
                  >
                    <Controller
                      control={form.control}
                      name={`pauses.${index}.startDate`}
                      render={({ field: dateField }) => (
                        <DateField
                          id={`pauses.${index}.startDate`}
                          value={dateField.value ?? ''}
                          onChange={dateField.onChange}
                          disabled={isPending}
                        />
                      )}
                    />
                  </Field>
                  <Field
                    id={`pauses.${index}.endDate`}
                    label="Do"
                    error={errors.pauses?.[index]?.endDate?.message}
                  >
                    <Controller
                      control={form.control}
                      name={`pauses.${index}.endDate`}
                      render={({ field: dateField }) => (
                        <DateField
                          id={`pauses.${index}.endDate`}
                          value={dateField.value ?? ''}
                          onChange={dateField.onChange}
                          disabled={isPending}
                        />
                      )}
                    />
                  </Field>
                  <Field id={`pauses.${index}.reason`} label="Razlog (opciono)">
                    <Input
                      id={`pauses.${index}.reason`}
                      placeholder="npr. Kolektivni godišnji"
                      disabled={isPending}
                      {...form.register(`pauses.${index}.reason`)}
                    />
                  </Field>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isPending}
                      aria-label="Ukloni pauzu"
                      onClick={() => pauseFields.remove(index)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              ))
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => pauseFields.append({ startDate: '', endDate: '', reason: '' })}
            >
              <Plus className="size-4" aria-hidden />
              Dodaj pauzu
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Osnovni podaci vožnje</CardTitle>
            <CardDescription>Primenjuju se na svaku generisanu vožnju u seriji.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field
              id="referenceNumber"
              label="RN broj (opciono)"
              error={errors.referenceNumber?.message as string | undefined}
            >
              <Input
                id="referenceNumber"
                placeholder="Obično se dodeljuje po instanci, ne za celu seriju"
                disabled={isPending}
                {...form.register('referenceNumber')}
              />
            </Field>
            <Field id="country" label="Država" error={errors.country?.message as string | undefined}>
              <Input id="country" placeholder="npr. Srbija" disabled={isPending} {...form.register('country')} />
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
                {...form.register('passengerCount', { valueAsNumber: true })}
              />
            </Field>
            <Field id="origin" label="Polazište" error={errors.origin?.message as string | undefined}>
              <Input
                id="origin"
                placeholder="npr. Čoka"
                disabled={isPending}
                {...form.register('origin')}
              />
            </Field>
            <Field
              id="destination"
              label="Odredište"
              error={errors.destination?.message as string | undefined}
            >
              <Input
                id="destination"
                placeholder="npr. OŠ Čoka"
                disabled={isPending}
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
              <Field
                id="clientName"
                label="Naziv / ime naručioca"
                error={errors.clientName?.message as string | undefined}
              >
                <Input id="clientName" disabled={isPending} {...form.register('clientName')} />
              </Field>
            ) : (
              <Controller
                control={form.control}
                name="partnerId"
                render={({ field }) => (
                  <Field id="partnerId" label="Partner" error={errors.partnerId?.message as string | undefined}>
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
                <Field
                  id="contractId"
                  label="Povezan ugovor (opciono)"
                  error={errors.contractId?.message as string | undefined}
                >
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
            <CardTitle>Vozila i vozači</CardTitle>
            <CardDescription>
              Isti skup se dodeljuje svakoj generisanoj vožnji — kasnije se može promeniti pojedinačno ili
              za sve buduće instance od izabranog datuma.
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
                maxSelected={MAX_TRIP_DRIVERS}
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
                <Field
                  id="paymentMethod"
                  label="Način plaćanja"
                  error={errors.paymentMethod?.message as string | undefined}
                >
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
            <Link href="/trips">Otkaži</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Generisanje…' : 'Generiši seriju'}
          </Button>
        </div>
      </form>
    </>
  );
}
