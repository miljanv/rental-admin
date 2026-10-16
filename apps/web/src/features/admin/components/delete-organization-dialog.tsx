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
import { useDeleteOrganization } from '@/features/admin/hooks/use-delete-organization';

interface DeleteOrganizationDialogProps {
  organization: OrganizationDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function DeleteOrganizationDialog({
  organization,
  onOpenChange,
}: DeleteOrganizationDialogProps) {
  const deleteMutation = useDeleteOrganization();

  const handleConfirm = async () => {
    if (!organization) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id: organization.id, name: organization.name });
      onOpenChange(false);
    } catch {
      // The mutation reports the failure as a toast and the dialog stays open.
    }
  };

  return (
    <AlertDialog open={organization !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Obrisati ovu firmu?</AlertDialogTitle>
          <AlertDialogDescription>
            {organization
              ? `${organization.name} se briše samo ako nema korisnike ni podatke. Firmu sa podacima deaktivirajte umesto brisanja.`
              : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>Otkaži</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void handleConfirm();
            }}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Brisanje…' : 'Obriši'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
