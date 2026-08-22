'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ABSENCE_REASON_LABELS,
  ABSENCE_REASONS,
  type GenerateAbsenceAttestationRequest,
} from '@rental-admin/shared';
import { FileDown } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { DateField } from '@/components/common/date-field';
import { DateTimeField, dateFromDateTimeLocal } from '@/components/common/date-time-field';
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
import { employmentContractDates } from '@/features/absence-attestations/lib/employment-contract-dates';
import {
  EMPTY_ABSENCE_FORM,
  absenceAttestationFormSchema,
  type AbsenceAttestationFormValues,
} from '@/features/absence-attestations/schemas/absence-attestation-form-schema';
import { useDriverDocuments } from '@/features/driver-documents/hooks/use-driver-documents';

interface GenerateAbsenceAttestationFormProps {
  driverId: string;
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

export function GenerateAbsenceAttestationForm({
  driverId,
  onSaved,
}: GenerateAbsenceAttestationFormProps) {
  const mutation = useGenerateAbsenceAttestation(driverId);
  const documentsQuery = useDriverDocuments(driverId);
  const { startsAt, signedAt } = employmentContractDates(documentsQuery.data ?? []);
  const form = useForm<AbsenceAttestationFormValues, unknown, GenerateAbsenceAttestationRequest>({
    resolver: zodResolver(absenceAttestationFormSchema),
    defaultValues: EMPTY_ABSENCE_FORM,
  });
  const reason = useWatch({ control: form.control, name: 'reason' });
  const errors = form.formState.errors;

  useEffect(() => {
    if (startsAt && !form.getValues('startedWorkAt')) {
      form.setValue('startedWorkAt', startsAt);
    }

    if (signedAt && !form.getValues('contractSignedAt')) {
      form.setValue('contractSignedAt', signedAt);
    }
  }, [form, signedAt, startsAt]);

  const onSubmit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync(values);
    onSaved?.();
  });

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Nova potvrda o odsustvu</CardTitle>
        <CardDescription>
          AETR / EC 561/2006. Početak rada i potpis ugovora se povlače iz ugovora o radu. Vreme je
          00–24, datum je dd.mm.gggg.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="periodFrom" label="Period od" error={errors.periodFrom?.message}>
              <Controller
                control={form.control}
                name="periodFrom"
                render={({ field }) => (
                  <DateTimeField
                    id="periodFrom"
                    value={field.value}
                    onChange={field.onChange}
                    aria-invalid={Boolean(errors.periodFrom)}
                  />
                )}
              />
            </Field>
            <Field id="periodTo" label="Period do" error={errors.periodTo?.message}>
              <Controller
                control={form.control}
                name="periodTo"
                render={({ field }) => (
                  <DateTimeField
                    id="periodTo"
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                      const issuedAt = dateFromDateTimeLocal(value);
                      if (issuedAt) {
                        form.setValue('issuedAt', issuedAt, { shouldDirty: true });
                      }
                    }}
                    aria-invalid={Boolean(errors.periodTo)}
                  />
                )}
              />
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
            <Field
              id="contractSignedAt"
              label="Datum potpisivanja ugovora"
              error={errors.contractSignedAt?.message}
            >
              <Controller
                control={form.control}
                name="contractSignedAt"
                render={({ field }) => (
                  <DateField id="contractSignedAt" value={field.value} onChange={field.onChange} />
                )}
              />
            </Field>
            <Field
              id="passportNumber"
              label="Broj pasoša (opciono)"
              error={errors.passportNumber?.message}
            >
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
