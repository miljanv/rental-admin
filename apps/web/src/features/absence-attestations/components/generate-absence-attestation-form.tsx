'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ABSENCE_REASON_LABELS,
  ABSENCE_REASONS,
  type GenerateAbsenceAttestationRequest,
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
import { useGenerateAbsenceAttestation } from '@/features/absence-attestations/hooks/use-generate-absence-attestation';
import {
  EMPTY_ABSENCE_FORM,
  absenceAttestationFormSchema,
  type AbsenceAttestationFormValues,
} from '@/features/absence-attestations/schemas/absence-attestation-form-schema';

interface GenerateAbsenceAttestationFormProps {
  driverId: string;
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

export function GenerateAbsenceAttestationForm({ driverId }: GenerateAbsenceAttestationFormProps) {
  const mutation = useGenerateAbsenceAttestation(driverId);
  const form = useForm<AbsenceAttestationFormValues, unknown, GenerateAbsenceAttestationRequest>({
    resolver: zodResolver(absenceAttestationFormSchema),
    defaultValues: EMPTY_ABSENCE_FORM,
  });
  const reason = useWatch({ control: form.control, name: 'reason' });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync(values);
  });

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Nova potvrda o odsustvu</CardTitle>
        <CardDescription>
          AETR / EC 561/2006. Generiše se za svaki period u kojem vozač nije upravljao vozilom.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="periodFrom" label="Period od" error={errors.periodFrom?.message}>
              <Input id="periodFrom" type="datetime-local" {...form.register('periodFrom')} />
            </Field>
            <Field id="periodTo" label="Period do" error={errors.periodTo?.message}>
              <Input id="periodTo" type="datetime-local" {...form.register('periodTo')} />
            </Field>
            <Field id="reason" label="Razlog" error={errors.reason?.message}>
              <Controller
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="reason" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ABSENCE_REASONS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {ABSENCE_REASON_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            {reason === 'OTHER' ? (
              <Field id="otherReason" label="Opis razloga" error={errors.otherReason?.message}>
                <Input id="otherReason" {...form.register('otherReason')} />
              </Field>
            ) : null}
            <Field id="place" label="Mesto" error={errors.place?.message}>
              <Input id="place" {...form.register('place')} />
            </Field>
            <Field id="issuedAt" label="Datum izdavanja" error={errors.issuedAt?.message}>
              <Controller
                control={form.control}
                name="issuedAt"
                render={({ field }) => (
                  <DateField id="issuedAt" value={field.value} onChange={field.onChange} />
                )}
              />
            </Field>
            <Field
              id="startedWorkAt"
              label="Početak rada u firmi"
              error={errors.startedWorkAt?.message}
            >
              <Controller
                control={form.control}
                name="startedWorkAt"
                render={({ field }) => (
                  <DateField id="startedWorkAt" value={field.value} onChange={field.onChange} />
                )}
              />
            </Field>
            <Field id="passportNumber" label="Broj pasoša (opciono)" error={errors.passportNumber?.message}>
              <Input id="passportNumber" {...form.register('passportNumber')} />
            </Field>
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            <FileDown className="size-4" aria-hidden />
            {mutation.isPending ? 'Generisanje…' : 'Generiši PDF'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
