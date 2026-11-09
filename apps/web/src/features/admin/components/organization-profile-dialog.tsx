'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  organizationProfileSchema,
  type OrganizationDto,
  type OrganizationProfileRequest,
} from '@rental-admin/shared';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateOrganizationProfile } from '@/features/admin/hooks/use-update-organization-profile';

type ProfileFormValues = z.input<typeof organizationProfileSchema>;

const FIELDS: {
  name: keyof OrganizationProfileRequest;
  label: string;
  inputMode?: 'numeric' | 'tel' | 'email';
}[] = [
  { name: 'taxId', label: 'PIB', inputMode: 'numeric' },
  { name: 'registrationNumber', label: 'Matični broj', inputMode: 'numeric' },
  { name: 'address', label: 'Adresa' },
  { name: 'contactName', label: 'Kontakt osoba' },
  { name: 'contactPhone', label: 'Telefon', inputMode: 'tel' },
  { name: 'contactEmail', label: 'E-mail', inputMode: 'email' },
];

function ProfileForm({
  organization,
  onDone,
}: {
  organization: OrganizationDto;
  onDone: () => void;
}) {
  const mutation = useUpdateOrganizationProfile();
  const { profile } = organization;
  const form = useForm<ProfileFormValues, unknown, OrganizationProfileRequest>({
    resolver: zodResolver(organizationProfileSchema),
    defaultValues: {
      taxId: profile.taxId ?? '',
      registrationNumber: profile.registrationNumber ?? '',
      address: profile.address ?? '',
      contactName: profile.contactName ?? '',
      contactPhone: profile.contactPhone ?? '',
      contactEmail: profile.contactEmail ?? '',
    },
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync({ id: organization.id, body: values });
      onDone();
    } catch {
      // The mutation reports the failure as a toast and the dialog stays open.
    }
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Podaci o firmi</DialogTitle>
        <DialogDescription>{organization.name}. Sva polja su opciona.</DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} noValidate className="space-y-4 overflow-y-auto px-6 pb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <div
              key={field.name}
              className={field.name === 'address' ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}
            >
              <Label htmlFor={`organization-${field.name}`}>{field.label}</Label>
              <Input
                id={`organization-${field.name}`}
                autoComplete="off"
                inputMode={field.inputMode}
                disabled={mutation.isPending}
                aria-invalid={Boolean(errors[field.name])}
                {...form.register(field.name)}
              />
              {errors[field.name] ? (
                <p className="text-destructive text-xs">{errors[field.name]?.message}</p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onDone} disabled={mutation.isPending}>
            Otkaži
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Čuvanje…' : 'Sačuvaj'}
          </Button>
        </div>
      </form>
    </>
  );
}

interface OrganizationProfileDialogProps {
  organization: OrganizationDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function OrganizationProfileDialog({
  organization,
  onOpenChange,
}: OrganizationProfileDialogProps) {
  return (
    <Dialog open={organization !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {/* Mounted only while open, so every opening starts from the stored values. */}
        {organization ? (
          <ProfileForm
            key={organization.id}
            organization={organization}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
