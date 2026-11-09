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
import { useRevokeUserSessions } from '@/features/admin/hooks/use-revoke-user-sessions';

interface RevokeSessionsDialogProps {
  user: ManagedUserDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function RevokeSessionsDialog({ user, onOpenChange }: RevokeSessionsDialogProps) {
  const mutation = useRevokeUserSessions();

  const handleConfirm = async () => {
    if (!user) {
      return;
    }

    try {
      await mutation.mutateAsync(user.id);
      onOpenChange(false);
    } catch {
      // The mutation reports the failure as a toast and the dialog stays open.
    }
  };

  return (
    <AlertDialog open={user !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Odjaviti korisnika sa svih uređaja?</AlertDialogTitle>
          <AlertDialogDescription>
            {user
              ? `${user.username} biće odjavljen na svim uređajima pri sledećem zahtevu i moraće ponovo da se prijavi.`
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
            {mutation.isPending ? 'Odjavljivanje…' : 'Odjavi'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
