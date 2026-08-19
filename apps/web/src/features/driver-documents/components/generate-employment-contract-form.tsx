'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  EMPLOYMENT_CONTRACT_TYPE_LABELS,
  EMPLOYMENT_CONTRACT_TYPES,
  type DriverDocumentDto,
  type DriverDto,
  type GenerateEmploymentContractRequest,
} from '@rental-admin/shared';
import { FileDown } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';

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
import { useGenerateEmploymentContract } from '@/features/driver-documents/hooks/use-generate-employment-contract';
import {
  employmentContractFormSchema,
  employmentContractFormValues,
  type EmploymentContractFormValues,
} from '@/features/driver-documents/schemas/generated-document-form-schema';
import { cn } from '@/lib/utils';

interface GenerateEmploymentContractFormProps {
  driver: DriverDto;
  /** The existing Ugovor o radu, if any — pre-fills the form so "izmeni" replaces it instead of duplicating it. */
  existing?: DriverDocumentDto;
  onSaved?: () => void;
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

export function GenerateEmploymentContractForm({
  driver,
  existing,
  onSaved,
}: GenerateEmploymentContractFormProps) {
  const isEdit = Boolean(existing);
  const mutation = useGenerateEmploymentContract(driver.id);
  const form = useForm<EmploymentContractFormValues, unknown, GenerateEmploymentContractRequest>({
    resolver: zodResolver(employmentContractFormSchema),
    defaultValues: employmentContractFormValues(driver, existing),
  });
  const contractType = useWatch({ control: form.control, name: 'employmentContractType' });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync(values);
    onSaved?.();
  });

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>{isEdit ? 'Izmena ugovora o radu' : 'Ugovor o radu'}</CardTitle>
        <CardDescription>
          {isEdit
            ? 'Menja postojeći ugovor — generisani PDF zamenjuje prethodni, broj dokumenta ostaje isti.'
            : `Popunjava se podacima zaposlenog ${driver.firstName} ${driver.lastName}. Generisani PDF se čuva u dokumentima.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="employmentContractType" label="Tip ugovora" error={errors.employmentContractType?.message}>
              <Controller
                control={form.control}
                name="employmentContractType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="employmentContractType" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_CONTRACT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {EMPLOYMENT_CONTRACT_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field id="startsAt" label="Datum stupanja" error={errors.startsAt?.message}>
              <Controller
                control={form.control}
                name="startsAt"
                render={({ field }) => (
                  <DateField id="startsAt" value={field.value} onChange={field.onChange} />
                )}
              />
            </Field>
            {contractType === 'FIXED_TERM' ? (
              <Field id="expiresAt" label="Datum isteka" error={errors.expiresAt?.message}>
                <Controller
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <DateField id="expiresAt" value={field.value ?? ''} onChange={field.onChange} />
                  )}
                />
              </Field>
            ) : null}
            <Field id="signedAt" label="Datum zaključenja" error={errors.signedAt?.message}>
              <Controller
                control={form.control}
                name="signedAt"
                render={({ field }) => (
                  <DateField id="signedAt" value={field.value} onChange={field.onChange} />
                )}
              />
            </Field>
            <Field id="netSalary" label="Zarada (neto, RSD)" error={errors.netSalary?.message}>
              <Input id="netSalary" type="number" step="0.01" {...form.register('netSalary')} />
            </Field>
            <Field
              id="transportAllowance"
              label="Naknada za prevoz"
              error={errors.transportAllowance?.message}
            >
              <Input
                id="transportAllowance"
                type="number"
                step="0.01"
                {...form.register('transportAllowance')}
              />
            </Field>
            <Field id="mealAllowance" label="Naknada za ishranu" error={errors.mealAllowance?.message}>
              <Input id="mealAllowance" type="number" step="0.01" {...form.register('mealAllowance')} />
            </Field>
            <Field id="holidayAllowance" label="Regres" error={errors.holidayAllowance?.message}>
              <Input
                id="holidayAllowance"
                type="number"
                step="0.01"
                {...form.register('holidayAllowance')}
              />
            </Field>
            <Field id="workplace" label="Mesto rada" error={errors.workplace?.message}>
              <Input id="workplace" {...form.register('workplace')} />
            </Field>
            <Field id="municipality" label="Opština prebivališta" error={errors.municipality?.message}>
              <Input id="municipality" {...form.register('municipality')} />
            </Field>
            <Field id="residenceStreet" label="Ulica i broj" error={errors.residenceStreet?.message}>
              <Input id="residenceStreet" {...form.register('residenceStreet')} />
            </Field>
            <Field id="trialPeriodDays" label="Probni rad (dana)" error={errors.trialPeriodDays?.message}>
              <Input id="trialPeriodDays" type="number" {...form.register('trialPeriodDays')} />
            </Field>
            <Field id="weeklyHours" label="Časova nedeljno" error={errors.weeklyHours?.message}>
              <Input id="weeklyHours" type="number" {...form.register('weeklyHours')} />
            </Field>
          </div>
          <Field id="jobDescription" label="Opis poslova" error={errors.jobDescription?.message}>
            <textarea
              id="jobDescription"
              rows={4}
              className={cn(
                'w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none',
                'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
              )}
              {...form.register('jobDescription')}
            />
          </Field>
          <Button type="submit" disabled={mutation.isPending}>
            <FileDown className="size-4" aria-hidden />
            {mutation.isPending ? 'Generisanje…' : isEdit ? 'Sačuvaj izmene' : 'Generiši PDF'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
