'use client';

import type { ManagedUserDto } from '@rental-admin/shared';

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
import { useDeleteUser } from '@/features/admin/hooks/use-delete-user';

interface DeleteUserDialogProps {
  user: ManagedUserDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function DeleteUserDialog({ user, onOpenChange }: DeleteUserDialogProps) {
  const deleteMutation = useDeleteUser();

  const handleConfirm = async () => {
    if (!user) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id: user.id, username: user.username });
      onOpenChange(false);
    } catch {
      // The mutation reports the failure as a toast and the dialog stays open.
    }
  };

  return (
    <AlertDialog open={user !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Obrisati ovog korisnika?</AlertDialogTitle>
          <AlertDialogDescription>
            {user
              ? `${user.username} više neće moći da se prijavi. Korisnik koji je kreirao zapise ne može se obrisati — deaktivirajte ga umesto toga.`
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
