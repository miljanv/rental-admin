'use client';

import { TRIP_EXPENSE_CATEGORY_LABELS, type TripExpenseDto } from '@rental-admin/shared';

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
import { useDeleteTripExpense } from '@/features/trips/hooks/use-delete-trip-expense';
import { formatMoney } from '@/lib/format';

interface DeleteTripExpenseDialogProps {
  tripId: string;
  expense: TripExpenseDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function DeleteTripExpenseDialog({
  tripId,
  expense,
  onOpenChange,
}: DeleteTripExpenseDialogProps) {
  const deleteMutation = useDeleteTripExpense(tripId);
  const categoryLabel = expense ? TRIP_EXPENSE_CATEGORY_LABELS[expense.category] : '';

  const handleConfirm = async () => {
    if (!expense) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        expenseId: expense.id,
        label: `${categoryLabel} · ${formatMoney(expense.amount)}`,
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
              ? `${categoryLabel} od ${formatMoney(expense.amount)} će biti uklonjen sa vožnje i iz Finansija. Ova radnja se ne može opozvati.`
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
