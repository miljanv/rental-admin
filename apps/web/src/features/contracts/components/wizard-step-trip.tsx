'use client';

import type { ContractWriteRequest } from '@rental-admin/shared';
import { Controller, useFormContext, type UseFormReturn } from 'react-hook-form';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ContractFormValues } from '@/features/contracts/schemas/contract-form-schema';

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

type ContractForm = UseFormReturn<ContractFormValues, unknown, ContractWriteRequest>;

export function WizardStepTrip() {
  const form = useFormContext<ContractFormValues>() as ContractForm;
  const errors = form.formState.errors;

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Period i relacija</CardTitle>
        <CardDescription>Kada i gde se prevoz obavlja.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Field id="conclusionDate" label="Datum zaključenja" error={errors.conclusionDate?.message}>
          <Input id="conclusionDate" type="date" {...form.register('conclusionDate')} />
        </Field>
        <Field id="passengerCount" label="Broj putnika" error={errors.passengerCount?.message}>
          <Input
            id="passengerCount"
            type="number"
            inputMode="numeric"
            aria-invalid={Boolean(errors.passengerCount)}
            {...form.register('passengerCount', { valueAsNumber: true })}
          />
        </Field>
        <Field id="serviceStartDate" label="Početak usluge" error={errors.serviceStartDate?.message}>
          <Input id="serviceStartDate" type="date" {...form.register('serviceStartDate')} />
        </Field>
        <Field id="serviceEndDate" label="Kraj usluge" error={errors.serviceEndDate?.message}>
          <Input id="serviceEndDate" type="date" {...form.register('serviceEndDate')} />
        </Field>
        <div className="sm:col-span-2">
          <Field id="route" label="Relacija" error={errors.route?.message}>
            <Input
              id="route"
              placeholder="npr. Novi Sad - Zlatibor - Novi Sad"
              {...form.register('route')}
            />
          </Field>
        </div>
        <div className="flex items-start gap-2 sm:col-span-2">
          <Controller
            control={form.control}
            name="isInternational"
            render={({ field }) => (
              <Checkbox
                id="isInternational"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                className="mt-0.5"
              />
            )}
          />
          <div className="space-y-1">
            <Label htmlFor="isInternational" className="font-normal">
              Ruta ide u inostranstvo
            </Label>
            <p className="text-muted-foreground text-xs">
              Uključuje spisak putnika za &quot;zelenu listu&quot; i zahteva putnu dozvolu pre nego što
              ugovor pređe u status &quot;u toku&quot;.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
