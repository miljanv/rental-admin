'use client';

import type { OrganizationDto } from '@rental-admin/shared';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSetOrganizationActive } from '@/features/admin/hooks/use-set-organization-active';

interface SuspendOrganizationDialogProps {
  organization: OrganizationDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

/** Confirms suspending an active organization, or reactivating a suspended one. */
export function SuspendOrganizationDialog({
  organization,
  onOpenChange,
}: SuspendOrganizationDialogProps) {
  const mutation = useSetOrganizationActive();
  const suspending = organization?.isActive ?? true;

  const handleConfirm = async () => {
    if (!organization) {
      return;
    }

    try {
      await mutation.mutateAsync(organization);
      onOpenChange(false);
    } catch {
      // The mutation reports the failure as a toast and the dialog stays open.
    }
  };

  return (
    <AlertDialog open={organization !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {suspending ? 'Suspendovati firmu?' : 'Aktivirati firmu?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {organization && suspending
              ? `Korisnici firme ${organization.name} biće odmah odjavljeni i neće moći da se prijave dok firmu ponovo ne aktivirate. Podaci firme ostaju sačuvani.`
              : organization
                ? `Korisnici firme ${organization.name} ponovo će moći da se prijave.`
                : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Otkaži</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void handleConfirm();
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Čuvanje…' : suspending ? 'Suspenduj' : 'Aktiviraj'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
