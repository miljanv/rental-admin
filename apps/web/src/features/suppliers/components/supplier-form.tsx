'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  PIB_LENGTH,
  REGISTRATION_NUMBER_LENGTH,
  type SupplierDto,
  type SupplierWriteRequest,
} from '@rental-admin/shared';
import { Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { CharacterCounter } from '@/components/common/character-counter';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateSupplier } from '@/features/suppliers/hooks/use-create-supplier';
import { useUpdateSupplier } from '@/features/suppliers/hooks/use-update-supplier';
import {
  EMPTY_SUPPLIER_FORM,
  supplierFormSchema,
  toSupplierFormValues,
  type SupplierFormValues,
} from '@/features/suppliers/schemas/supplier-form-schema';

interface SupplierFormProps {
  supplier?: SupplierDto;
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
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {hint}
      </div>
      {children}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}

export function SupplierForm({ supplier }: SupplierFormProps) {
  const isEdit = Boolean(supplier);
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier(supplier?.id ?? '');
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<SupplierFormValues, unknown, SupplierWriteRequest>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: supplier ? toSupplierFormValues(supplier) : EMPTY_SUPPLIER_FORM,
  });
  const bankAccounts = useFieldArray({ control: form.control, name: 'bankAccounts' });

  const pib = useWatch({ control: form.control, name: 'pib' });
  const registrationNumber = useWatch({ control: form.control, name: 'registrationNumber' });
  const errors = form.formState.errors;

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
        description: 'Neka polja nisu popunjena ili nisu ispravnog formata.',
      });
    },
  );

  return (
    <>
      <PageHeader
        title={isEdit ? 'Izmena dobavljača' : 'Novi dobavljač'}
        description={
          isEdit
            ? 'Ažurirajte kontakt i identifikacione podatke dobavljača.'
            : 'Dodajte dobavljača u evidenciju za brži unos troškova, goriva i finansija.'
        }
      />

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Osnovni podaci</CardTitle>
            <CardDescription>Naziv je obavezan. Ostala polja mogu ostati prazna.</CardDescription>
          </CardHeader>
          <CardContent className="grid max-w-3xl gap-4 sm:grid-cols-2">
            <Field id="name" label="Naziv dobavljača" error={errors.name?.message}>
              <Input
                id="name"
                disabled={isPending}
                aria-invalid={Boolean(errors.name)}
                {...form.register('name')}
              />
            </Field>

            <Field id="contactPerson" label="Kontakt osoba" error={errors.contactPerson?.message}>
              <Input
                id="contactPerson"
                disabled={isPending}
                aria-invalid={Boolean(errors.contactPerson)}
                {...form.register('contactPerson')}
              />
            </Field>

            <Field id="email" label="Email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                disabled={isPending}
                aria-invalid={Boolean(errors.email)}
                {...form.register('email')}
              />
            </Field>

            <Field id="phone" label="Telefon" error={errors.phone?.message}>
              <Input
                id="phone"
                disabled={isPending}
                aria-invalid={Boolean(errors.phone)}
                {...form.register('phone')}
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

            <Field id="address" label="Adresa" error={errors.address?.message}>
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

            <div className="sm:col-span-2">
              <Field id="note" label="Napomena" error={errors.note?.message}>
                <Textarea
                  id="note"
                  rows={4}
                  disabled={isPending}
                  aria-invalid={Boolean(errors.note)}
                  {...form.register('note')}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Bankovni računi</CardTitle>
            <CardDescription>
              Koriste se za automatsko povezivanje isplata sa izvoda sa dobavljačem.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-w-2xl space-y-3">
            {bankAccounts.fields.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nije dodat nijedan račun.</p>
            ) : null}
            {bankAccounts.fields.map((field, index) => (
              <div key={field.id} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <Field
                  id={`bankAccounts.${index}.accountNumber`}
                  label={`Račun ${index + 1}`}
                  error={errors.bankAccounts?.[index]?.accountNumber?.message}
                >
                  <Input
                    id={`bankAccounts.${index}.accountNumber`}
                    placeholder="160-0000001902222-87"
                    disabled={isPending}
                    aria-invalid={Boolean(errors.bankAccounts?.[index]?.accountNumber)}
                    {...form.register(`bankAccounts.${index}.accountNumber`)}
                  />
                </Field>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="mt-0 sm:mt-7"
                  disabled={isPending}
                  onClick={() => bankAccounts.remove(index)}
                  aria-label={`Obriši račun ${index + 1}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => bankAccounts.append({ accountNumber: '' })}
            >
              <Plus className="size-4" aria-hidden />
              Dodaj račun
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" asChild>
            <Link href="/suppliers">Otkaži</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Čuvanje…' : 'Sačuvaj dobavljača'}
          </Button>
        </div>
      </form>
    </>
  );
}
