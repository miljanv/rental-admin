'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  DRIVER_STATUS_LABELS,
  DRIVER_STATUSES,
  DRIVING_LICENSE_CATEGORIES,
  DRIVING_LICENSE_CATEGORY_LABELS,
  EDUCATION_LEVELS,
  ID_CARD_NUMBER_LENGTH,
  JMBG_LENGTH,
  type DriverDto,
  type DriverWriteRequest,
  type DrivingLicenseCategory,
} from '@rental-admin/shared';
import Link from 'next/link';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { CharacterCounter } from '@/components/common/character-counter';
import { DateField } from '@/components/common/date-field';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateDriver } from '@/features/drivers/hooks/use-create-driver';
import { useUpdateDriver } from '@/features/drivers/hooks/use-update-driver';
import { toDriverFormValues } from '@/features/drivers/lib/driver';
import {
  driverFormSchema,
  EMPTY_DRIVER_FORM,
  type DriverFormValues,
} from '@/features/drivers/schemas/driver-form-schema';

interface DriverFormProps {
  driver?: DriverDto;
}

const isDrivingLicenseCategory = (value: string): value is DrivingLicenseCategory =>
  (DRIVING_LICENSE_CATEGORIES as readonly string[]).includes(value);

/** `drivingLicenseCategory` is stored as one comma-separated string (e.g. "B, C, CE"). */
const splitCategoryTokens = (value: string): string[] =>
  value
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}

function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {hint}
      </div>
      {children}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}

export function DriverForm({ driver }: DriverFormProps) {
  const isEdit = Boolean(driver);
  const createMutation = useCreateDriver();
  const updateMutation = useUpdateDriver(driver?.id ?? '');
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<DriverFormValues, unknown, DriverWriteRequest>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: driver ? toDriverFormValues(driver) : EMPTY_DRIVER_FORM,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEdit) {
      await updateMutation.mutateAsync(values);
      return;
    }

    await createMutation.mutateAsync(values);
  });

  const errors = form.formState.errors;
  const cancelHref = driver ? `/drivers/${driver.id}` : '/drivers';
  const jmbg = useWatch({ control: form.control, name: 'jmbg' });
  const idCardNumber = useWatch({ control: form.control, name: 'idCardNumber' });
  const educationLevel = useWatch({ control: form.control, name: 'educationLevel' });
  // educationLevel stays free text on the record, so a value from before this
  // list existed (or typed by hand) must still show up as selected instead of
  // silently looking empty.
  const educationLevelOptions =
    educationLevel && !(EDUCATION_LEVELS as readonly string[]).includes(educationLevel)
      ? [educationLevel, ...EDUCATION_LEVELS]
      : EDUCATION_LEVELS;

  return (
    <>
      <PageHeader
        title={isEdit ? 'Izmena vozača' : 'Novi vozač'}
        description={
          isEdit
            ? 'Ažurirajte osnovne podatke i status vozača.'
            : 'Unesite osnovne podatke vozača u evidenciju.'
        }
      />

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Lični podaci</CardTitle>
            <CardDescription>Ime, identifikacija i prebivalište.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="firstName" label="Ime" error={errors.firstName?.message}>
              <Input
                id="firstName"
                autoComplete="given-name"
                disabled={isPending}
                aria-invalid={Boolean(errors.firstName)}
                {...form.register('firstName')}
              />
            </Field>
            <Field id="lastName" label="Prezime" error={errors.lastName?.message}>
              <Input
                id="lastName"
                autoComplete="family-name"
                disabled={isPending}
                aria-invalid={Boolean(errors.lastName)}
                {...form.register('lastName')}
              />
            </Field>
            <Field
              id="jmbg"
              label="JMBG"
              error={errors.jmbg?.message}
              hint={<CharacterCounter current={jmbg.length} max={JMBG_LENGTH} />}
            >
              <Input
                id="jmbg"
                inputMode="numeric"
                maxLength={JMBG_LENGTH}
                disabled={isPending}
                aria-invalid={Boolean(errors.jmbg)}
                {...form.register('jmbg')}
              />
            </Field>
            <Field id="dateOfBirth" label="Datum rođenja" error={errors.dateOfBirth?.message}>
              <Controller
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <DateField
                    id="dateOfBirth"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isPending}
                    aria-invalid={Boolean(errors.dateOfBirth)}
                  />
                )}
              />
            </Field>
            <Field
              id="residencePlace"
              label="Mesto prebivališta"
              error={errors.residencePlace?.message}
            >
              <Input
                id="residencePlace"
                disabled={isPending}
                aria-invalid={Boolean(errors.residencePlace)}
                {...form.register('residencePlace')}
              />
            </Field>
            <Controller
              control={form.control}
              name="educationLevel"
              render={({ field }) => (
                <Field
                  id="educationLevel"
                  label="Stručna sprema"
                  error={errors.educationLevel?.message}
                >
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <SelectTrigger id="educationLevel" className="w-full">
                      <SelectValue placeholder="Izaberite stručnu spremu" />
                    </SelectTrigger>
                    <SelectContent>
                      {educationLevelOptions.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Field
              id="idCardNumber"
              label="Broj lične karte"
              error={errors.idCardNumber?.message}
              hint={<CharacterCounter current={idCardNumber.length} max={ID_CARD_NUMBER_LENGTH} />}
            >
              <Input
                id="idCardNumber"
                inputMode="numeric"
                maxLength={ID_CARD_NUMBER_LENGTH}
                disabled={isPending}
                aria-invalid={Boolean(errors.idCardNumber)}
                {...form.register('idCardNumber')}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Vozačka dozvola i licenca</CardTitle>
            <CardDescription>Brojevi dokumenata potrebnih za rad.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field
              id="drivingLicenseNumber"
              label="Broj vozačke dozvole"
              error={errors.drivingLicenseNumber?.message}
            >
              <Input
                id="drivingLicenseNumber"
                disabled={isPending}
                aria-invalid={Boolean(errors.drivingLicenseNumber)}
                {...form.register('drivingLicenseNumber')}
              />
            </Field>
            <div className="sm:col-span-2">
              <Controller
                control={form.control}
                name="drivingLicenseCategory"
                render={({ field }) => {
                  const tokens = splitCategoryTokens(field.value);
                  const selected = new Set(
                    tokens.map((token) => token.toUpperCase()).filter(isDrivingLicenseCategory),
                  );
                  // Anything already saved that isn't one of the known codes is kept as-is
                  // instead of being silently dropped the next time this form is submitted.
                  const unrecognized = tokens.filter(
                    (token) => !isDrivingLicenseCategory(token.toUpperCase()),
                  );

                  const toggle = (category: DrivingLicenseCategory) => {
                    const next = new Set(selected);
                    if (next.has(category)) {
                      next.delete(category);
                    } else {
                      next.add(category);
                    }
                    const ordered = DRIVING_LICENSE_CATEGORIES.filter((code) => next.has(code));
                    field.onChange([...ordered, ...unrecognized].join(', '));
                  };

                  return (
                    <Field
                      id="drivingLicenseCategory"
                      label="Kategorija"
                      error={errors.drivingLicenseCategory?.message}
                    >
                      <div className="grid grid-cols-1 gap-x-4 gap-y-2 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-3">
                        {DRIVING_LICENSE_CATEGORIES.map((category) => (
                          <label
                            key={category}
                            className="flex cursor-pointer items-start gap-2 text-sm"
                          >
                            <Checkbox
                              checked={selected.has(category)}
                              onCheckedChange={() => toggle(category)}
                              disabled={isPending}
                              className="mt-0.5"
                            />
                            <span>
                              <span className="font-medium">{category}</span>{' '}
                              <span className="text-muted-foreground text-xs">
                                {DRIVING_LICENSE_CATEGORY_LABELS[category]}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </Field>
                  );
                }}
              />
            </div>
            <Field id="licenseNumber" label="Broj licence" error={errors.licenseNumber?.message}>
              <Input
                id="licenseNumber"
                disabled={isPending}
                aria-invalid={Boolean(errors.licenseNumber)}
                {...form.register('licenseNumber')}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Kontakt i radni status</CardTitle>
            <CardDescription>Način kontakta, radno mesto i trenutni status.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="phone" label="Telefon" error={errors.phone?.message}>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                disabled={isPending}
                aria-invalid={Boolean(errors.phone)}
                {...form.register('phone')}
              />
            </Field>
            <Field id="email" label="Email (opciono)" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                disabled={isPending}
                aria-invalid={Boolean(errors.email)}
                {...form.register('email')}
              />
            </Field>
            <Field id="jobTitle" label="Radno mesto" error={errors.jobTitle?.message}>
              <Input
                id="jobTitle"
                disabled={isPending}
                aria-invalid={Boolean(errors.jobTitle)}
                {...form.register('jobTitle')}
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
                      {DRIVER_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {DRIVER_STATUS_LABELS[status]}
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
            {isPending ? 'Čuvanje…' : isEdit ? 'Sačuvaj izmene' : 'Dodaj vozača'}
          </Button>
        </div>
      </form>
    </>
  );
}
