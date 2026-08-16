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
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { CharacterCounter } from '@/components/common/character-counter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useCreatePartner } from '@/features/partners/hooks/use-create-partner';
import {
  EMPTY_PARTNER_FORM,
  partnerFormSchema,
  type PartnerFormValues,
} from '@/features/partners/schemas/partner-form-schema';

interface QuickCreatePartnerSheetProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreated: (partner: PartnerDto) => void;
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

/** Lets the user add a new partner without leaving the contract wizard. */
export function QuickCreatePartnerSheet({ open, onOpenChange, onCreated }: QuickCreatePartnerSheetProps) {
  const createMutation = useCreatePartner({ redirect: false });

  const form = useForm<PartnerFormValues, unknown, PartnerWriteRequest>({
    resolver: zodResolver(partnerFormSchema),
    defaultValues: EMPTY_PARTNER_FORM,
  });

  const errors = form.formState.errors;
  const type = useWatch({ control: form.control, name: 'type' });
  const pib = useWatch({ control: form.control, name: 'pib' });
  const registrationNumber = useWatch({ control: form.control, name: 'registrationNumber' });
  const personalId = useWatch({ control: form.control, name: 'personalId' });
  const isLegalEntity = isLegalEntityPartnerType(type);

  const onSubmit = form.handleSubmit(
    async (values) => {
      try {
        const partner = await createMutation.mutateAsync(values);
        form.reset(EMPTY_PARTNER_FORM);
        onCreated(partner);
        onOpenChange(false);
      } catch {
        // The mutation already reports the failure as a toast.
      }
    },
    () => {
      toast.error('Ispravite greške u formi.', {
        description: 'Neka obavezna polja nisu popunjena ili nisu ispravnog formata.',
      });
    },
  );

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          form.reset(EMPTY_PARTNER_FORM);
        }
        onOpenChange(isOpen);
      }}
    >
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Novi partner</SheetTitle>
          <SheetDescription>Dodajte partnera bez napuštanja kreiranja ugovora.</SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} noValidate className="space-y-4 px-4">
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Field id="quick-partner-type" label="Tip" error={errors.type?.message}>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
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
                  disabled={createMutation.isPending}
                >
                  <SelectTrigger id="quick-partner-type" className="w-full">
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
              <Field id="quick-companyName" label="Naziv firme" error={errors.companyName?.message}>
                <Input
                  id="quick-companyName"
                  disabled={createMutation.isPending}
                  aria-invalid={Boolean(errors.companyName)}
                  {...form.register('companyName')}
                />
              </Field>
              <Field
                id="quick-nickname"
                label="Nadimak / uobičajen naziv (opciono)"
                error={errors.nickname?.message as string | undefined}
              >
                <Input
                  id="quick-nickname"
                  placeholder="npr. Tortilje"
                  disabled={createMutation.isPending}
                  aria-invalid={Boolean(errors.nickname)}
                  {...form.register('nickname')}
                />
              </Field>
              <Field
                id="quick-pib"
                label="PIB"
                error={errors.pib?.message}
                hint={<CharacterCounter current={(pib ?? '').length} max={PIB_LENGTH} />}
              >
                <Input
                  id="quick-pib"
                  inputMode="numeric"
                  maxLength={PIB_LENGTH}
                  disabled={createMutation.isPending}
                  aria-invalid={Boolean(errors.pib)}
                  {...form.register('pib')}
                />
              </Field>
              <Field
                id="quick-registrationNumber"
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
                  id="quick-registrationNumber"
                  inputMode="numeric"
                  maxLength={REGISTRATION_NUMBER_LENGTH}
                  disabled={createMutation.isPending}
                  aria-invalid={Boolean(errors.registrationNumber)}
                  {...form.register('registrationNumber')}
                />
              </Field>
            </>
          ) : (
            <>
              <Field id="quick-firstName" label="Ime" error={errors.firstName?.message}>
                <Input
                  id="quick-firstName"
                  disabled={createMutation.isPending}
                  aria-invalid={Boolean(errors.firstName)}
                  {...form.register('firstName')}
                />
              </Field>
              <Field id="quick-lastName" label="Prezime" error={errors.lastName?.message}>
                <Input
                  id="quick-lastName"
                  disabled={createMutation.isPending}
                  aria-invalid={Boolean(errors.lastName)}
                  {...form.register('lastName')}
                />
              </Field>
              <Field
                id="quick-personalId"
                label="JMBG"
                error={errors.personalId?.message}
                hint={<CharacterCounter current={(personalId ?? '').length} max={JMBG_LENGTH} />}
              >
                <Input
                  id="quick-personalId"
                  inputMode="numeric"
                  maxLength={JMBG_LENGTH}
                  disabled={createMutation.isPending}
                  aria-invalid={Boolean(errors.personalId)}
                  {...form.register('personalId')}
                />
              </Field>
            </>
          )}

          <Field id="quick-address" label="Adresa (ulica i broj)" error={errors.address?.message}>
            <Input
              id="quick-address"
              disabled={createMutation.isPending}
              aria-invalid={Boolean(errors.address)}
              {...form.register('address')}
            />
          </Field>

          <Field id="quick-city" label="Mesto" error={errors.city?.message}>
            <Input
              id="quick-city"
              disabled={createMutation.isPending}
              aria-invalid={Boolean(errors.city)}
              {...form.register('city')}
            />
          </Field>

          <SheetFooter className="px-0">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Čuvanje…' : 'Dodaj partnera'}
            </Button>
            <SheetClose asChild>
              <Button type="button" variant="outline" disabled={createMutation.isPending}>
                Otkaži
              </Button>
            </SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
