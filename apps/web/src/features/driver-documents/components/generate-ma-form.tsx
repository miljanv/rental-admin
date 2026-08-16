'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  GENDER_LABELS,
  GENDERS,
  MA_EMPLOYMENT_KIND_LABELS,
  MA_EMPLOYMENT_KINDS,
  type DriverDocumentDto,
  type DriverDto,
  type GenerateMaFormRequest,
} from '@rental-admin/shared';
import { FileDown } from 'lucide-react';
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
import { useGenerateMaForm } from '@/features/driver-documents/hooks/use-generate-ma-form';
import {
  maFormSchema,
  maFormValues,
  type MaFormValues,
} from '@/features/driver-documents/schemas/generated-document-form-schema';

interface GenerateMaFormProps {
  driver: DriverDto;
  /** The existing Obrazac MA, if any — pre-fills the form so "izmeni" replaces it instead of duplicating it. */
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

export function GenerateMaForm({ driver, existing, onSaved }: GenerateMaFormProps) {
  const isEdit = Boolean(existing);
  const mutation = useGenerateMaForm(driver.id);
  const form = useForm<MaFormValues, unknown, GenerateMaFormRequest>({
    resolver: zodResolver(maFormSchema),
    defaultValues: maFormValues(driver, existing),
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync(values);
    onSaved?.();
  });

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>{isEdit ? 'Izmena obrasca MA' : 'Obrazac MA'}</CardTitle>
        <CardDescription>
          {isEdit
            ? 'Menja postojeći obrazac — generisani PDF zamenjuje prethodni, broj dokumenta ostaje isti.'
            : 'Prijava na obavezno socijalno osiguranje. JMBG, ime i prebivalište se uzimaju sa profila. Generisani PDF se čuva u dokumentima.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="gender" label="Pol" error={errors.gender?.message}>
              <Controller
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="gender" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((gender) => (
                        <SelectItem key={gender} value={gender}>
                          {GENDER_LABELS[gender]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field id="parentName" label="Ime jednog roditelja" error={errors.parentName?.message}>
              <Input id="parentName" {...form.register('parentName')} />
            </Field>
            <Field id="municipality" label="Opština" error={errors.municipality?.message}>
              <Input id="municipality" {...form.register('municipality')} />
            </Field>
            <Field id="residenceStreet" label="Ulica i broj" error={errors.residenceStreet?.message}>
              <Input id="residenceStreet" {...form.register('residenceStreet')} />
            </Field>
            <Field id="apartment" label="Stan (opciono)" error={errors.apartment?.message}>
              <Input id="apartment" {...form.register('apartment')} />
            </Field>
            <Field id="citizenship" label="Državljanstvo" error={errors.citizenship?.message}>
              <Input id="citizenship" {...form.register('citizenship')} />
            </Field>
            <Field
              id="insuranceStartDate"
              label="Datum početka osiguranja"
              error={errors.insuranceStartDate?.message}
            >
              <Controller
                control={form.control}
                name="insuranceStartDate"
                render={({ field }) => (
                  <DateField id="insuranceStartDate" value={field.value} onChange={field.onChange} />
                )}
              />
            </Field>
            <Field id="occupation" label="Zanimanje" error={errors.occupation?.message}>
              <Input id="occupation" {...form.register('occupation')} />
            </Field>
            <Field id="qualification" label="Kvalifikacija" error={errors.qualification?.message}>
              <Input id="qualification" {...form.register('qualification')} />
            </Field>
            <Field id="weeklyHours" label="Časova nedeljno" error={errors.weeklyHours?.message}>
              <Input id="weeklyHours" type="number" {...form.register('weeklyHours')} />
            </Field>
            <Field id="insuranceBasis" label="Osnov osiguranja" error={errors.insuranceBasis?.message}>
              <Input id="insuranceBasis" {...form.register('insuranceBasis')} />
            </Field>
            <Field id="employmentKind" label="Vrsta zaposlenja" error={errors.employmentKind?.message}>
              <Controller
                control={form.control}
                name="employmentKind"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="employmentKind" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MA_EMPLOYMENT_KINDS.map((kind) => (
                        <SelectItem key={kind} value={kind}>
                          {MA_EMPLOYMENT_KIND_LABELS[kind]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field id="workplace" label="Mesto rada" error={errors.workplace?.message}>
              <Input id="workplace" {...form.register('workplace')} />
            </Field>
            <Field
              id="companyRegistrationNumber"
              label="Matični broj obveznika"
              error={errors.companyRegistrationNumber?.message}
            >
              <Input
                id="companyRegistrationNumber"
                {...form.register('companyRegistrationNumber')}
              />
            </Field>
            <Field id="activityCode" label="Šifra delatnosti" error={errors.activityCode?.message}>
              <Input id="activityCode" {...form.register('activityCode')} />
            </Field>
            <Field id="activity" label="Delatnost" error={errors.activity?.message}>
              <Input id="activity" {...form.register('activity')} />
            </Field>
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            <FileDown className="size-4" aria-hidden />
            {mutation.isPending ? 'Generisanje…' : isEdit ? 'Sačuvaj izmene' : 'Generiši PDF'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
