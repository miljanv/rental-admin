'use client';

import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type UnsettledAdvanceGroupDto,
} from '@rental-admin/shared';
import { useState } from 'react';

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
import { DateField } from '@/components/common/date-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSettleAdvances } from '@/features/transactions/hooks/use-settle-advances';
import { formatMoney } from '@/lib/format';

interface SettleAdvancesDialogProps {
  group: UnsettledAdvanceGroupDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

const todayIso = (): string => new Date().toISOString().slice(0, 10);

export function SettleAdvancesDialog({ group, onOpenChange }: SettleAdvancesDialogProps) {
  const settleMutation = useSettleAdvances();
  const [occurredAt, setOccurredAt] = useState(todayIso);
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>('ACCOUNT');
  const [note, setNote] = useState('');

  const defaultNote = group ? `${group.supplier.toUpperCase()} ISPLAĆENO` : '';

  const handleConfirm = async () => {
    if (!group) {
      return;
    }

    try {
      await settleMutation.mutateAsync({
        supplier: group.supplier,
        occurredAt,
        paymentMethod,
        advanceIds: group.advances.map((advance) => advance.id),
        note: note.trim() ? note.trim() : defaultNote,
      });
      onOpenChange(false);
    } catch {
      // Toast already shown.
    }
  };

  return (
    <AlertDialog
      open={group !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setNote('');
          setOccurredAt(todayIso());
          setPaymentMethod('ACCOUNT');
        }

        onOpenChange(isOpen);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Razduži avanse</AlertDialogTitle>
          <AlertDialogDescription>
            {group
              ? `${group.supplier}: ${group.count} avansa u iznosu ${formatMoney(group.total)}. Konačna faktura se povezuje sa svim nerazduženim avansima ovog dobavljača.`
              : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="settle-date">Datum fakture</Label>
            <DateField
              id="settle-date"
              value={occurredAt}
              onChange={setOccurredAt}
              disabled={settleMutation.isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settle-payment">Način plaćanja</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as (typeof PAYMENT_METHODS)[number])}
              disabled={settleMutation.isPending}
            >
              <SelectTrigger id="settle-payment" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {PAYMENT_METHOD_LABELS[method]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settle-note">Napomena</Label>
            <Input
              id="settle-note"
              placeholder={defaultNote}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={settleMutation.isPending}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={settleMutation.isPending}>Otkaži</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void handleConfirm();
            }}
            disabled={settleMutation.isPending}
          >
            {settleMutation.isPending ? 'Razduživanje…' : 'Razduži'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
