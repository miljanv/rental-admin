'use client';

import type { AnnouncementDto } from '@rental-admin/shared';

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
import { useDeleteAnnouncement } from '@/features/announcements/hooks/use-delete-announcement';

interface DeleteAnnouncementDialogProps {
  announcement: AnnouncementDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function DeleteAnnouncementDialog({
  announcement,
  onOpenChange,
}: DeleteAnnouncementDialogProps) {
  const deleteMutation = useDeleteAnnouncement();

  const handleConfirm = async () => {
    if (!announcement) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(announcement.id);
      onOpenChange(false);
    } catch {
      // The mutation reports the failure as a toast and the dialog stays open.
    }
  };

  return (
    <AlertDialog open={announcement !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Obrisati obaveštenje?</AlertDialogTitle>
          <AlertDialogDescription>
            Korisnici ga više neće videti. Ako treba samo da prestane da se prikazuje, postavite mu
            kraj.
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
