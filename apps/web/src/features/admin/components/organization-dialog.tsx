'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { organizationWriteSchema, type OrganizationDto } from '@rental-admin/shared';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateOrganization } from '@/features/admin/hooks/use-create-organization';
import { useUpdateOrganization } from '@/features/admin/hooks/use-update-organization';

type OrganizationFormInput = z.input<typeof organizationWriteSchema>;

interface OrganizationFormProps {
  organization: OrganizationDto | null;
  onDone: () => void;
}

function OrganizationForm({ organization, onDone }: OrganizationFormProps) {
  const isEdit = organization !== null;
  const createMutation = useCreateOrganization();
  const updateMutation = useUpdateOrganization();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<OrganizationFormInput, unknown, z.output<typeof organizationWriteSchema>>({
    resolver: zodResolver(organizationWriteSchema),
    defaultValues: {
      name: organization?.name ?? '',
      isActive: organization?.isActive ?? true,
    },
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (organization) {
        await updateMutation.mutateAsync({ id: organization.id, body: values });
      } else {
        await createMutation.mutateAsync(values);
      }

      onDone();
    } catch {
      // The mutation reports the failure as a toast and the dialog stays open.
    }
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Izmena firme' : 'Nova firma'}</DialogTitle>
        <DialogDescription>
          Svaka firma ima sopstvene podatke koje vide samo njeni korisnici.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} noValidate className="space-y-4 px-6 pb-6">
        <div className="space-y-1.5">
          <Label htmlFor="organization-name">Naziv firme</Label>
          <Input
            id="organization-name"
            autoComplete="off"
            disabled={isPending}
            aria-invalid={Boolean(errors.name)}
            {...form.register('name')}
          />
          {errors.name ? <p className="text-destructive text-xs">{errors.name.message}</p> : null}
        </div>

        <Controller
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <div className="flex items-start gap-3">
              <Checkbox
                id="organization-active"
                checked={field.value ?? true}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                disabled={isPending}
              />
              <div className="space-y-0.5">
                <Label htmlFor="organization-active">Aktivna firma</Label>
                <p className="text-muted-foreground text-xs">
                  Korisnici neaktivne firme ne mogu da se prijave.
                </p>
              </div>
            </div>
          )}
        />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
            Otkaži
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Čuvanje…' : isEdit ? 'Sačuvaj izmene' : 'Dodaj firmu'}
          </Button>
        </div>
      </form>
    </>
  );
}

interface OrganizationDialogProps {
  open: boolean;
  /** Null creates a new organization. */
  organization: OrganizationDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function OrganizationDialog({ open, organization, onOpenChange }: OrganizationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {/* Mounted only while open, so every opening starts from fresh values. */}
        {open ? (
          <OrganizationForm
            key={organization?.id ?? 'new'}
            organization={organization}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
