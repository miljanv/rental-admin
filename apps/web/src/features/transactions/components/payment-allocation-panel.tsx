'use client';

import {
  SETTLEMENT_TARGET_TYPE_LABELS,
  type PaymentAllocationWriteRequest,
  type SettlementTargetDto,
  type TransactionDto,
} from '@rental-admin/shared';
import { Link2, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreatePaymentAllocation } from '@/features/transactions/hooks/use-create-payment-allocation';
import { useSettlementTargets } from '@/features/transactions/hooks/use-settlement-targets';
import { formatDate, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

interface PaymentAllocationPanelProps {
  transaction: TransactionDto;
  onDone: () => void;
}

const targetOptionLabel = (target: SettlementTargetDto): string =>
  `${SETTLEMENT_TARGET_TYPE_LABELS[target.targetType]} · ${target.counterparty} · ${formatMoney(
    target.remainingAmount,
  )}`;

export function PaymentAllocationPanel({ transaction, onDone }: PaymentAllocationPanelProps) {
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const targetsQuery = useSettlementTargets(
    { transactionId: transaction.id, search, limit: 80 },
    Boolean(transaction.id),
  );
  const mutation = useCreatePaymentAllocation();
  const targets = targetsQuery.data?.targets ?? [];
  const selectedTarget = useMemo(
    () =>
      targets.find((target) => `${target.targetType}:${target.targetId}` === selectedKey) ?? null,
    [selectedKey, targets],
  );

  useEffect(() => {
    setSelectedKey('');
    setAmount('');
    setNote('');
  }, [transaction.id]);

  useEffect(() => {
    if (!selectedTarget) {
      return;
    }

    const suggested = Math.min(transaction.unallocatedAmount, selectedTarget.remainingAmount);
    setAmount(String(Math.max(0, Math.round(suggested * 100) / 100)));
  }, [selectedTarget, transaction.unallocatedAmount]);

  const canSubmit = Boolean(selectedTarget) && Number(amount) > 0 && !mutation.isPending;

  const submit = async () => {
    if (!selectedTarget) {
      return;
    }

    const body: PaymentAllocationWriteRequest = {
      targetType: selectedTarget.targetType,
      targetId: selectedTarget.targetId,
      amount: Number(amount),
      note,
    };

    try {
      await mutation.mutateAsync({ transactionId: transaction.id, body });
      onDone();
    } catch {
      // Toast is handled by the mutation.
    }
  };

  return (
    <Card className="mb-6 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="size-4" aria-hidden />
          Rasknjižavanje
        </CardTitle>
        <CardDescription>
          {formatMoney(transaction.unallocatedAmount)} je nerasknjiženo od transakcije{' '}
          {formatMoney(transaction.amount)} od {formatDate(transaction.occurredAt)}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <div className="space-y-1.5">
            <Label htmlFor="settlement-search">Pretraga otvorenih zaduženja</Label>
            <Input
              id="settlement-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                transaction.type === 'EXPENSE'
                  ? 'Dobavljač, broj računa, opis'
                  : 'Kupac, RN, relacija'
              }
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => void targetsQuery.refetch()}
              disabled={targetsQuery.isFetching}
              className="w-full"
            >
              <RefreshCw
                className={cn('size-4', targetsQuery.isFetching && 'animate-spin')}
                aria-hidden
              />
              Osveži
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
          <div className="space-y-1.5">
            <Label>Otvoreno zaduženje</Label>
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={targetsQuery.isPending ? 'Učitavanje…' : 'Izaberi'} />
              </SelectTrigger>
              <SelectContent>
                {targets.map((target) => (
                  <SelectItem
                    key={`${target.targetType}:${target.targetId}`}
                    value={`${target.targetType}:${target.targetId}`}
                  >
                    {targetOptionLabel(target)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTarget ? (
              <p className="text-muted-foreground text-xs">
                {selectedTarget.label} · {formatDate(selectedTarget.issuedAt)} · ukupno{' '}
                {formatMoney(selectedTarget.totalAmount)}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settlement-amount">Iznos</Label>
            <Input
              id="settlement-amount"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="settlement-note">Napomena</Label>
          <Input
            id="settlement-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Opcionalno"
          />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onDone} disabled={mutation.isPending}>
            Otkaži
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={!canSubmit}>
            {mutation.isPending ? 'Čuvanje…' : 'Sačuvaj rasknjižavanje'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
