'use client';

import {
  SETTLEMENT_TARGET_TYPE_LABELS,
  type PaymentAllocationWriteRequest,
  type SettlementTargetDto,
  type TransactionDto,
} from '@rental-admin/shared';
import { Check, Link2, LoaderCircle, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/common/error-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaymentSettlementControls } from './payment-settlement-controls';
import { useCreatePaymentAllocation } from '@/features/transactions/hooks/use-create-payment-allocation';
import { useSettlementTargets } from '@/features/transactions/hooks/use-settlement-targets';
import { formatDate, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

interface PaymentAllocationPanelProps {
  transaction: TransactionDto;
  onDone: () => void;
}

const SEARCH_DEBOUNCE_MS = 250;

const normalizeSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('sr-Latn');

export function PaymentAllocationPanel({
  transaction: initialTransaction,
  onDone,
}: PaymentAllocationPanelProps) {
  const [transaction, setTransaction] = useState(initialTransaction);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<SettlementTargetDto | null>(null);
  const [amountOverride, setAmount] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [search]);

  const targetsQuery = useSettlementTargets(
    {
      transactionId: transaction.id,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      limit: 40,
    },
    Boolean(transaction.id),
  );
  const mutation = useCreatePaymentAllocation();
  const isSearchDebouncing = search.trim() !== debouncedSearch;
  const visibleTargets = useMemo(() => {
    const targets = targetsQuery.data?.targets ?? [];
    const normalizedSearch = normalizeSearchText(search.trim());
    if (!normalizedSearch) return targets;

    return targets.filter((target) =>
      normalizeSearchText(`${target.counterparty} ${target.label}`).includes(normalizedSearch),
    );
  }, [search, targetsQuery.data?.targets]);
  const suggested = selectedTarget
    ? Math.min(transaction.unallocatedAmount, selectedTarget.remainingAmount)
    : 0;
  const amount =
    amountOverride ??
    (selectedTarget ? String(Math.max(0, Math.round(suggested * 100) / 100)) : '');

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
          {transaction.type === 'EXPENSE' && transaction.supplier ? (
            <> Prepoznat dobavljač: {transaction.supplier}.</>
          ) : transaction.type === 'INCOME' && transaction.partner ? (
            <> Prepoznat kupac: {transaction.partner}.</>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PaymentSettlementControls
          transaction={transaction}
          onUpdated={(updated) => {
            setTransaction(updated);
            setSelectedTarget(null);
            setAmount(null);
          }}
        />
        {targetsQuery.isError ? (
          <ErrorState
            error={targetsQuery.error}
            title="Zaduženja nisu učitana"
            onRetry={() => void targetsQuery.refetch()}
          />
        ) : !targetsQuery.isPending &&
          !targetsQuery.isFetching &&
          !isSearchDebouncing &&
          visibleTargets.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nema otvorenih računa za izabranu pretragu. Uplata ostaje u evidenciji dok je ne
            povežete.
          </p>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <div className="space-y-1.5">
            <Label htmlFor="settlement-search">Pretraga otvorenih zaduženja</Label>
            <Input
              id="settlement-search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSelectedTarget(null);
                setAmount(null);
              }}
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label>Predložena otvorena zaduženja</Label>
            {targetsQuery.isFetching || isSearchDebouncing ? (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <LoaderCircle className="size-3 animate-spin" aria-hidden />
                Pretraživanje…
              </span>
            ) : null}
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-2">
            {visibleTargets.map((target) => {
              const targetKey = `${target.targetType}:${target.targetId}`;
              const selectedKey = selectedTarget
                ? `${selectedTarget.targetType}:${selectedTarget.targetId}`
                : null;
              const isSelected = targetKey === selectedKey;

              return (
                <button
                  key={targetKey}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedTarget(target);
                    setAmount(null);
                  }}
                  className={cn(
                    'hover:bg-muted/70 focus-visible:border-ring focus-visible:ring-ring/50 flex w-full items-start gap-3 rounded-md border p-3 text-left outline-none transition-colors focus-visible:ring-3',
                    isSelected ? 'border-primary bg-primary/5' : 'border-transparent',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/40',
                    )}
                  >
                    {isSelected ? <Check className="size-3.5" aria-hidden /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {target.counterparty}
                      {target.recommended ? <Badge variant="secondary">Preporučeno</Badge> : null}
                    </span>
                    <span className="text-muted-foreground mt-1 block text-xs">
                      {SETTLEMENT_TARGET_TYPE_LABELS[target.targetType]} · {target.label} ·{' '}
                      {formatDate(target.issuedAt)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-sm font-semibold">
                    {formatMoney(target.remainingAmount)}
                    <span className="text-muted-foreground block text-xs font-normal">
                      preostalo
                    </span>
                  </span>
                </button>
              );
            })}
            {targetsQuery.isPending ? (
              <p className="text-muted-foreground p-3 text-sm">Učitavanje otvorenih računa…</p>
            ) : visibleTargets.length === 0 && !isSearchDebouncing ? (
              <p className="text-muted-foreground p-3 text-sm">Nema rezultata.</p>
            ) : visibleTargets.length === 0 ? (
              <p className="text-muted-foreground p-3 text-sm">Pretraživanje…</p>
            ) : null}
          </div>
          <p className="text-muted-foreground text-xs">
            Pretraga obuhvata dobavljača ili kupca, broj računa i opis. Kliknite na račun koji
            želite da zatvorite.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
          <div className="space-y-1.5">
            <Label>Izabrano zaduženje</Label>
            {selectedTarget ? (
              <div className="rounded-lg border p-3 text-sm">
                <span className="font-medium">{selectedTarget.counterparty}</span>
                <span className="text-muted-foreground block text-xs">
                  {selectedTarget.label} · ukupno {formatMoney(selectedTarget.totalAmount)}
                </span>
              </div>
            ) : (
              <div className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
                Izaberite račun iz predloga iznad.
              </div>
            )}
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
