'use client';

import type { FileObjectDto } from '@rental-admin/shared';

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
import { useDeleteFile } from '@/features/files/hooks/use-delete-file';

interface DeleteFileDialogProps {
  file: FileObjectDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function DeleteFileDialog({ file, onOpenChange }: DeleteFileDialogProps) {
  const deleteMutation = useDeleteFile();

  const handleConfirm = async () => {
    if (!file) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id: file.id, originalName: file.originalName });
      onOpenChange(false);
    } catch {
      // The mutation reports the failure as a toast and the dialog stays open.
    }
  };

  return (
    <AlertDialog open={file !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this file?</AlertDialogTitle>
          <AlertDialogDescription>
            {file
              ? `"${file.originalName}" will be removed from S3 and from the database. This cannot be undone.`
              : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              // Keep the dialog mounted until the request settles.
              event.preventDefault();
              void handleConfirm();
            }}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
