'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  isLegalEntityPartnerType,
  JMBG_LENGTH,
  PARTNER_TYPE_LABELS,
  PARTNER_TYPES,
  PIB_LENGTH,
  REGISTRATION_NUMBER_LENGTH,
  type PartnerDto,
  type PartnerWriteRequest,
} from '@rental-admin/shared';
import Link from 'next/link';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { CharacterCounter } from '@/components/common/character-counter';
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
import { useCreatePartner } from '@/features/partners/hooks/use-create-partner';
import { useUpdatePartner } from '@/features/partners/hooks/use-update-partner';
import { toPartnerFormValues } from '@/features/partners/lib/partner';
import {
  EMPTY_PARTNER_FORM,
  partnerFormSchema,
  type PartnerFormValues,
} from '@/features/partners/schemas/partner-form-schema';

interface PartnerFormProps {
  partner?: PartnerDto;
}

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

export function PartnerForm({ partner }: PartnerFormProps) {
  const isEdit = Boolean(partner);
  const createMutation = useCreatePartner();
  const updateMutation = useUpdatePartner(partner?.id ?? '');
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<PartnerFormValues, unknown, PartnerWriteRequest>({
    resolver: zodResolver(partnerFormSchema),
    defaultValues: partner ? toPartnerFormValues(partner) : EMPTY_PARTNER_FORM,
  });

  const onSubmit = form.handleSubmit(
    async (values) => {
      if (isEdit) {
        await updateMutation.mutateAsync(values);
        return;
      }

      await createMutation.mutateAsync(values);
    },
    () => {
      toast.error('Ispravite greške u formi.', {
        description: 'Neka obavezna polja nisu popunjena ili nisu ispravnog formata.',
      });
    },
  );

  const errors = form.formState.errors;
  const type = useWatch({ control: form.control, name: 'type' });
  const pib = useWatch({ control: form.control, name: 'pib' });
  const registrationNumber = useWatch({ control: form.control, name: 'registrationNumber' });
  const personalId = useWatch({ control: form.control, name: 'personalId' });
  const isLegalEntity = isLegalEntityPartnerType(type);

  return (
    <>
      <PageHeader
        title={isEdit ? 'Izmena partnera' : 'Novi partner'}
        description={
          isEdit
            ? 'Ažurirajte podatke partnera.'
            : 'Unesite podatke partnera (naručioca prevoza) u evidenciju.'
        }
      />

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Tip partnera</CardTitle>
            <CardDescription>Određuje koja polja identiteta su obavezna.</CardDescription>
          </CardHeader>
          <CardContent className="max-w-md space-y-4">
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Field id="type" label="Tip" error={errors.type?.message}>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Clear whichever identity fields no longer apply so a
                      // leftover value from the previous type can't fail
                      // validation (a legal entity can't carry firstName, etc).
                      if (isLegalEntityPartnerType(value as typeof field.value)) {
                        form.setValue('firstName', '');
                        form.setValue('lastName', '');
                        form.setValue('personalId', '');
                      } else {
                        form.setValue('companyName', '');
                        form.setValue('pib', '');
                        form.setValue('registrationNumber', '');
                      }
                    }}
                    disabled={isPending}
                  >
                    <SelectTrigger id="type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PARTNER_TYPES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {PARTNER_TYPE_LABELS[value]}
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
            <CardTitle>Identitet</CardTitle>
            <CardDescription>
              {isLegalEntity
                ? 'Naziv, PIB i matični broj pravnog lica.'
                : 'Ime, prezime i JMBG fizičkog lica.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="max-w-md space-y-4">
            {isLegalEntity ? (
              <>
                <Field id="companyName" label="Naziv firme" error={errors.companyName?.message}>
                  <Input
                    id="companyName"
                    disabled={isPending}
                    aria-invalid={Boolean(errors.companyName)}
                    {...form.register('companyName')}
                  />
                </Field>
                <Field
                  id="nickname"
                  label="Nadimak / uobičajen naziv (opciono)"
                  error={errors.nickname?.message as string | undefined}
                >
                  <Input
                    id="nickname"
                    placeholder="npr. Tortilje"
                    disabled={isPending}
                    aria-invalid={Boolean(errors.nickname)}
                    {...form.register('nickname')}
                  />
                </Field>
                <Field
                  id="pib"
                  label="PIB"
                  error={errors.pib?.message}
                  hint={<CharacterCounter current={(pib ?? '').length} max={PIB_LENGTH} />}
                >
                  <Input
                    id="pib"
                    inputMode="numeric"
                    maxLength={PIB_LENGTH}
                    disabled={isPending}
                    aria-invalid={Boolean(errors.pib)}
                    {...form.register('pib')}
                  />
                </Field>
                <Field
                  id="registrationNumber"
                  label="Matični broj"
                  error={errors.registrationNumber?.message}
                  hint={
                    <CharacterCounter
                      current={(registrationNumber ?? '').length}
                      max={REGISTRATION_NUMBER_LENGTH}
                    />
                  }
                >
                  <Input
                    id="registrationNumber"
                    inputMode="numeric"
                    maxLength={REGISTRATION_NUMBER_LENGTH}
                    disabled={isPending}
                    aria-invalid={Boolean(errors.registrationNumber)}
                    {...form.register('registrationNumber')}
                  />
                </Field>
              </>
            ) : (
              <>
                <Field id="firstName" label="Ime" error={errors.firstName?.message}>
                  <Input
                    id="firstName"
                    disabled={isPending}
                    aria-invalid={Boolean(errors.firstName)}
                    {...form.register('firstName')}
                  />
                </Field>
                <Field id="lastName" label="Prezime" error={errors.lastName?.message}>
                  <Input
                    id="lastName"
                    disabled={isPending}
                    aria-invalid={Boolean(errors.lastName)}
                    {...form.register('lastName')}
                  />
                </Field>
                <Field
                  id="personalId"
                  label="JMBG"
                  error={errors.personalId?.message}
                  hint={<CharacterCounter current={(personalId ?? '').length} max={JMBG_LENGTH} />}
                >
                  <Input
                    id="personalId"
                    inputMode="numeric"
                    maxLength={JMBG_LENGTH}
                    disabled={isPending}
                    aria-invalid={Boolean(errors.personalId)}
                    {...form.register('personalId')}
                  />
                </Field>
              </>
            )}
            <Field id="address" label="Adresa (ulica i broj)" error={errors.address?.message}>
              <Input
                id="address"
                disabled={isPending}
                aria-invalid={Boolean(errors.address)}
                {...form.register('address')}
              />
            </Field>
            <Field id="city" label="Mesto" error={errors.city?.message}>
              <Input
                id="city"
                disabled={isPending}
                aria-invalid={Boolean(errors.city)}
                {...form.register('city')}
              />
            </Field>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" asChild>
            <Link href="/partners">Otkaži</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Čuvanje…' : isEdit ? 'Sačuvaj izmene' : 'Dodaj partnera'}
          </Button>
        </div>
      </form>
    </>
  );
}
