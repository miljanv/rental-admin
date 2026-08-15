'use client';

import {
  isLegalEntityPartnerType,
  JMBG_LENGTH,
  PARTNER_TYPE_LABELS,
  PARTNER_TYPES,
  partnerDisplayName,
  PIB_LENGTH,
  REGISTRATION_NUMBER_LENGTH,
  type ContractWriteRequest,
  type PartnerDto,
} from '@rental-admin/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Controller, useFormContext, useWatch, type UseFormReturn } from 'react-hook-form';

import { CharacterCounter } from '@/components/common/character-counter';
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
import { QuickCreatePartnerSheet } from '@/features/contracts/components/quick-create-partner-sheet';
import type { ContractFormValues } from '@/features/contracts/schemas/contract-form-schema';
import { usePartners } from '@/features/partners/hooks/use-partners';

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

type ContractForm = UseFormReturn<ContractFormValues, unknown, ContractWriteRequest>;

/** Copies the selected partner's identity onto the contract's client* snapshot fields. */
const applyPartnerToClientFields = (form: ContractForm, partner: PartnerDto): void => {
  form.setValue('clientType', partner.type);
  form.setValue('clientCompanyName', partner.companyName);
  form.setValue('clientFirstName', partner.firstName);
  form.setValue('clientLastName', partner.lastName);
  form.setValue('clientAddress', partner.address);
  form.setValue('clientPib', partner.pib);
  form.setValue('clientRegistrationNumber', partner.registrationNumber);
  form.setValue('clientPersonalId', partner.personalId);
};

export function WizardStepPartner() {
  const form = useFormContext<ContractFormValues>() as ContractForm;
  const errors = form.formState.errors;
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const partnerId = useWatch({ control: form.control, name: 'partnerId' });
  const clientType = useWatch({ control: form.control, name: 'clientType' });
  const clientPib = useWatch({ control: form.control, name: 'clientPib' });
  const clientRegistrationNumber = useWatch({ control: form.control, name: 'clientRegistrationNumber' });
  const clientPersonalId = useWatch({ control: form.control, name: 'clientPersonalId' });
  const isLegalEntity = isLegalEntityPartnerType(clientType);

  const partnersQuery = usePartners({ page: 1, limit: 100, sortBy: 'type', sortOrder: 'asc' });
  const partners = partnersQuery.data?.partners ?? [];

  return (
    <div className="space-y-6">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Partner</CardTitle>
          <CardDescription>Izaberite naručioca prevoza ili dodajte novog.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Controller
              control={form.control}
              name="partnerId"
              render={({ field }) => (
                <Field id="partnerId" label="Partner" error={errors.partnerId?.message}>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      const selected = partners.find((partner) => partner.id === value);
                      if (selected) {
                        applyPartnerToClientFields(form, selected);
                      }
                    }}
                    disabled={partnersQuery.isPending}
                  >
                    <SelectTrigger id="partnerId" className="w-full">
                      <SelectValue placeholder="Izaberite partnera" />
                    </SelectTrigger>
                    <SelectContent>
                      {partners.map((partner) => (
                        <SelectItem key={partner.id} value={partner.id}>
                          {partnerDisplayName(partner)} — {PARTNER_TYPE_LABELS[partner.type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            {partnersQuery.isError ? (
              <p className="text-destructive mt-1.5 text-xs">
                Lista partnera nije učitana.{' '}
                <button type="button" className="underline" onClick={() => void partnersQuery.refetch()}>
                  Pokušaj ponovo
                </button>
              </p>
            ) : null}
          </div>
          <Button type="button" variant="outline" onClick={() => setIsSheetOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Novi partner
          </Button>
        </CardContent>
      </Card>

      {partnerId ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Podaci naručioca posla</CardTitle>
            <CardDescription>
              Preuzeto od partnera — možete prilagoditi za ovaj konkretan ugovor. Ugovor pamti ove
              podatke nezavisno od partnera, pa kasnija izmena partnera neće promeniti već potpisan
              ugovor.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="clientType"
              render={({ field }) => (
                <Field id="clientType" label="Tip naručioca" error={errors.clientType?.message}>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (isLegalEntityPartnerType(value as typeof field.value)) {
                        form.setValue('clientFirstName', '');
                        form.setValue('clientLastName', '');
                        form.setValue('clientPersonalId', '');
                      } else {
                        form.setValue('clientCompanyName', '');
                        form.setValue('clientPib', '');
                        form.setValue('clientRegistrationNumber', '');
                      }
                    }}
                  >
                    <SelectTrigger id="clientType" className="w-full">
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

            {isLegalEntity ? (
              <>
                <Field
                  id="clientCompanyName"
                  label="Naziv firme"
                  error={errors.clientCompanyName?.message}
                >
                  <Input id="clientCompanyName" {...form.register('clientCompanyName')} />
                </Field>
                <Field
                  id="clientPib"
                  label="PIB"
                  error={errors.clientPib?.message}
                  hint={<CharacterCounter current={(clientPib ?? '').length} max={PIB_LENGTH} />}
                >
                  <Input
                    id="clientPib"
                    inputMode="numeric"
                    maxLength={PIB_LENGTH}
                    {...form.register('clientPib')}
                  />
                </Field>
                <Field
                  id="clientRegistrationNumber"
                  label="Matični broj"
                  error={errors.clientRegistrationNumber?.message}
                  hint={
                    <CharacterCounter
                      current={(clientRegistrationNumber ?? '').length}
                      max={REGISTRATION_NUMBER_LENGTH}
                    />
                  }
                >
                  <Input
                    id="clientRegistrationNumber"
                    inputMode="numeric"
                    maxLength={REGISTRATION_NUMBER_LENGTH}
                    {...form.register('clientRegistrationNumber')}
                  />
                </Field>
              </>
            ) : (
              <>
                <Field id="clientFirstName" label="Ime" error={errors.clientFirstName?.message}>
                  <Input id="clientFirstName" {...form.register('clientFirstName')} />
                </Field>
                <Field id="clientLastName" label="Prezime" error={errors.clientLastName?.message}>
                  <Input id="clientLastName" {...form.register('clientLastName')} />
                </Field>
                <Field
                  id="clientPersonalId"
                  label="JMBG"
                  error={errors.clientPersonalId?.message}
                  hint={<CharacterCounter current={(clientPersonalId ?? '').length} max={JMBG_LENGTH} />}
                >
                  <Input
                    id="clientPersonalId"
                    inputMode="numeric"
                    maxLength={JMBG_LENGTH}
                    {...form.register('clientPersonalId')}
                  />
                </Field>
              </>
            )}

            <Field id="clientAddress" label="Adresa" error={errors.clientAddress?.message}>
              <Input id="clientAddress" {...form.register('clientAddress')} />
            </Field>
          </CardContent>
        </Card>
      ) : null}

      <QuickCreatePartnerSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onCreated={(partner) => {
          form.setValue('partnerId', partner.id);
          applyPartnerToClientFields(form, partner);
        }}
      />
    </div>
  );
}
