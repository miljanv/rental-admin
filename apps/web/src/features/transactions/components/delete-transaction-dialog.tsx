'use client';

import type { TransactionDto } from '@rental-admin/shared';

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
import { useDeleteTransaction } from '@/features/transactions/hooks/use-delete-transaction';
import { formatDate, formatMoney } from '@/lib/format';

interface DeleteTransactionDialogProps {
  transaction: TransactionDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function DeleteTransactionDialog({
  transaction,
  onOpenChange,
}: DeleteTransactionDialogProps) {
  const deleteMutation = useDeleteTransaction();

  const handleConfirm = async () => {
    if (!transaction) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        id: transaction.id,
        label: `${formatMoney(transaction.amount)} · ${formatDate(transaction.occurredAt)}`,
      });
      onOpenChange(false);
    } catch {
      // Toast already shown.
    }
  };

  return (
    <AlertDialog open={transaction !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Obrisati ovu transakciju?</AlertDialogTitle>
          <AlertDialogDescription>
            {transaction
              ? `${formatMoney(transaction.amount)} od ${formatDate(transaction.occurredAt)} će biti uklonjena. Ako je ovo razduženje, povezani avansi ponovo postaju nerazduženi.`
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
