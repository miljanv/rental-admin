'use client';

import { contractClientDisplayName, contractRouteLabel, type ContractDto } from '@rental-admin/shared';

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
import { useDeleteContract } from '@/features/contracts/hooks/use-delete-contract';

interface DeleteContractDialogProps {
  contract: ContractDto | null;
  redirectToList?: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function DeleteContractDialog({
  contract,
  redirectToList = false,
  onOpenChange,
}: DeleteContractDialogProps) {
  const deleteMutation = useDeleteContract();

  const handleConfirm = async () => {
    if (!contract) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        id: contract.id,
        name: `${contractClientDisplayName(contract)} — ${contractRouteLabel(contract)}`,
        redirectToList,
      });
      onOpenChange(false);
    } catch {
      // The mutation reports the failure as a toast and the dialog stays open.
    }
  };

  return (
    <AlertDialog open={contract !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Obrisati ovaj ugovor?</AlertDialogTitle>
          <AlertDialogDescription>
            {contract
              ? `Ugovor sa ${contractClientDisplayName(contract)} (${contractRouteLabel(contract)}) i svi generisani dokumenti biće trajno uklonjeni. Ova radnja se ne može opozvati.`
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
