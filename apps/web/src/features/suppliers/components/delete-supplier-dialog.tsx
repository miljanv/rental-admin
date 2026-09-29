'use client';

import type { SupplierDto } from '@rental-admin/shared';

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
import { useDeleteSupplier } from '@/features/suppliers/hooks/use-delete-supplier';

interface DeleteSupplierDialogProps {
  supplier: SupplierDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function DeleteSupplierDialog({ supplier, onOpenChange }: DeleteSupplierDialogProps) {
  const deleteMutation = useDeleteSupplier();

  const handleConfirm = async () => {
    if (!supplier) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id: supplier.id, name: supplier.name });
      onOpenChange(false);
    } catch {
      // The mutation reports the failure as a toast and the dialog stays open.
    }
  };

  return (
    <AlertDialog open={supplier !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Obrisati ovog dobavljača?</AlertDialogTitle>
          <AlertDialogDescription>
            {supplier
              ? `${supplier.name} će biti uklonjen iz evidencije. Postojeći troškovi i gorivo ostaju sačuvani sa tekstom dobavljača.`
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
