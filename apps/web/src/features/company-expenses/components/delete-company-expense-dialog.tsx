'use client';

import type { CompanyExpenseDto } from '@rental-admin/shared';

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
import { useDeleteCompanyExpense } from '@/features/company-expenses/hooks/use-delete-company-expense';
import { formatDate } from '@/lib/format';

interface DeleteCompanyExpenseDialogProps {
  expense: CompanyExpenseDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function DeleteCompanyExpenseDialog({
  expense,
  onOpenChange,
}: DeleteCompanyExpenseDialogProps) {
  const deleteMutation = useDeleteCompanyExpense();

  const handleConfirm = async () => {
    if (!expense) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        expenseId: expense.id,
        label: `${expense.supplier} · ${formatDate(expense.issuedAt)}`,
      });
      onOpenChange(false);
    } catch {
      // Toast already shown.
    }
  };

  return (
    <AlertDialog open={expense !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Obrisati ovaj trošak?</AlertDialogTitle>
          <AlertDialogDescription>
            {expense
              ? `Trošak dobavljača ${expense.supplier} od ${formatDate(expense.issuedAt)} biće uklonjen. Ova radnja se ne može opozvati.`
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
