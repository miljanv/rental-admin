'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { DRIVER_STATUS_LABELS, DRIVER_STATUSES, type DriverDto } from '@rental-admin/shared';
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

export function DriverForm({ driver }: DriverFormProps) {
  const isEdit = Boolean(driver);
  const createMutation = useCreateDriver();
  const updateMutation = useUpdateDriver(driver?.id ?? '');
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<DriverFormValues>({
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
            <Field id="jmbg" label="JMBG" error={errors.jmbg?.message}>
              <Input
                id="jmbg"
                inputMode="numeric"
                maxLength={13}
                disabled={isPending}
                aria-invalid={Boolean(errors.jmbg)}
                {...form.register('jmbg')}
              />
            </Field>
            <Field id="dateOfBirth" label="Datum rođenja" error={errors.dateOfBirth?.message}>
              <Input
                id="dateOfBirth"
                type="date"
                disabled={isPending}
                aria-invalid={Boolean(errors.dateOfBirth)}
                {...form.register('dateOfBirth')}
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
            <Field
              id="educationLevel"
              label="Stručna sprema"
              error={errors.educationLevel?.message}
            >
              <Input
                id="educationLevel"
                disabled={isPending}
                aria-invalid={Boolean(errors.educationLevel)}
                {...form.register('educationLevel')}
              />
            </Field>
            <Field id="idCardNumber" label="Broj lične karte" error={errors.idCardNumber?.message}>
              <Input
                id="idCardNumber"
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
            <Field
              id="drivingLicenseCategory"
              label="Kategorija"
              error={errors.drivingLicenseCategory?.message}
            >
              <Input
                id="drivingLicenseCategory"
                placeholder="npr. B, C, D, CE"
                disabled={isPending}
                aria-invalid={Boolean(errors.drivingLicenseCategory)}
                {...form.register('drivingLicenseCategory')}
              />
            </Field>
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
            <Field id="email" label="Email" error={errors.email?.message}>
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
