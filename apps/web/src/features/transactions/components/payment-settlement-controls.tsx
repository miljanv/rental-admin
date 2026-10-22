'use client';
import { useState } from 'react';
import { partnerSelectLabel, type TransactionDto } from '@rental-admin/shared';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorState } from '@/components/common/error-state';
import { usePartners } from '@/features/partners/hooks/use-partners';
import { useSuppliers } from '@/features/suppliers/hooks/use-suppliers';
import {
  useAllocationPlan,
  useConfirmAllocationPlan,
  useLinkCounterparty,
  usePaymentAllocations,
  useReverseAllocation,
} from '../hooks/use-payment-settlement';
import { formatDate, formatMoney } from '@/lib/format';

const auditLabels: Record<string, string> = {
  ALLOCATION_CREATED: 'Povezan račun',
  ALLOCATION_REVERSED: 'Poništeno povezivanje',
  ALLOCATION_PLAN_CONFIRMED: 'Potvrđen raspored',
  COUNTERPARTY_LINKED: 'Povezana stranka',
};

export function PaymentSettlementControls({
  transaction,
  onUpdated,
}: {
  transaction: TransactionDto;
  onUpdated: (transaction: TransactionDto) => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(
    transaction.type === 'INCOME' ? (transaction.partnerId ?? '') : (transaction.supplierId ?? ''),
  );
  const [remember, setRemember] = useState(false);
  const [ignoreReference, setIgnoreReference] = useState(false);
  const [reason, setReason] = useState('');
  const partners = usePartners({
    page: 1,
    limit: 100,
    sortBy: 'type',
    sortOrder: 'asc',
    ...(search ? { search } : {}),
  });
  const suppliers = useSuppliers({
    page: 1,
    limit: 100,
    sortBy: 'name',
    sortOrder: 'asc',
    ...(search ? { search } : {}),
  });
  const link = useLinkCounterparty();
  const preview = useAllocationPlan();
  const confirm = useConfirmAllocationPlan();
  const reverse = useReverseAllocation();
  const history = usePaymentAllocations(transaction.id);
  const isIncome = transaction.type === 'INCOME';
  const linkedId = isIncome ? transaction.partnerId : transaction.supplierId;
  const busy = link.isPending || preview.isPending || confirm.isPending || reverse.isPending;
  const options = isIncome
    ? (partners.data?.partners ?? []).map((row) => ({ id: row.id, name: partnerSelectLabel(row) }))
    : (suppliers.data?.suppliers ?? []).map((row) => ({ id: row.id, name: row.name }));
  const optionsQuery = isIncome ? partners : suppliers;
  const plan = preview.data;
  const change = async (work: () => Promise<TransactionDto>) => {
    try {
      const updated = await work();
      preview.reset();
      onUpdated(updated);
    } catch {
      /* Mutation renders error. */
    }
  };
  return (
    <div className="space-y-5 rounded-lg border p-4">
      {transaction.sourceType !== 'OPENING_BALANCE' ? (
        <div className="space-y-3">
          <h3 className="font-semibold">{isIncome ? 'Kupac uplate' : 'Dobavljač uplate'}</h3>
          <p className="text-muted-foreground text-sm">
            Bankovni račun ima prednost, zatim jednoznačno poklapanje po nazivu. Ako stranka nije
            prepoznata, izaberite je ovde. Povezivanje ne zatvara račune.
          </p>
          <Input
            aria-label="Pretraga stranke"
            placeholder="Pretraži kupca ili dobavljača"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            disabled={busy}
          />
          {optionsQuery.isError ? (
            <ErrorState
              error={optionsQuery.error}
              title="Stranke nisu učitane"
              onRetry={() => void optionsQuery.refetch()}
            />
          ) : (
            <select
              aria-label="Stranka uplate"
              className="border-input h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              disabled={busy || optionsQuery.isPending}
            >
              <option value="">
                {optionsQuery.isPending ? 'Učitavanje…' : 'Izaberite stranku'}
              </option>
              {linkedId && !options.some((row) => row.id === linkedId) ? (
                <option value={linkedId}>
                  {isIncome ? transaction.partner : transaction.supplier}
                </option>
              ) : null}
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          )}
          {!optionsQuery.isPending && !optionsQuery.isError && !options.length ? (
            <p className="text-sm text-muted-foreground">Nema rezultata pretrage.</p>
          ) : null}
          {transaction.note?.includes('Račun ') ? (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={remember}
                onCheckedChange={(value) => setRemember(value === true)}
                disabled={busy}
              />
              Zapamti bankovni račun za sledeći izvod
            </label>
          ) : null}
          <Button
            variant="outline"
            disabled={
              !selectedId || busy || (transaction.allocationCount > 0 && selectedId !== linkedId)
            }
            onClick={() =>
              void change(() =>
                link.mutateAsync({
                  id: transaction.id,
                  body: {
                    partyType: isIncome ? 'PARTNER' : 'SUPPLIER',
                    partyId: selectedId,
                    rememberAccount: remember,
                  },
                }),
              )
            }
          >
            Poveži stranku bez raspoređivanja
          </Button>
        </div>
      ) : null}
      <div className="space-y-3">
        <h3 className="font-semibold">Rasporedi po najstarijim dugovanjima</h3>
        <p className="text-sm text-muted-foreground">
          Raspoređuje se do {formatMoney(transaction.unallocatedAmount)}. Račun može biti delimično
          plaćen; višak ostaje dostupan za kasnije.
        </p>
        {transaction.note?.includes('Poziv ') ? (
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={ignoreReference}
              disabled={busy}
              onCheckedChange={(value) => {
                setIgnoreReference(value === true);
                preview.reset();
              }}
            />
            Potvrđujem raspoređivanje po starosti bez obzira na poziv na broj
          </label>
        ) : null}
        <Button
          variant="outline"
          disabled={!linkedId || transaction.unallocatedAmount <= 0.005 || busy}
          onClick={() => {
            preview.reset();
            preview.mutate({ id: transaction.id, body: { ignoreReference } });
          }}
        >
          {preview.isPending ? 'Priprema…' : 'Prikaži predlog'}
        </Button>
        {plan ? (
          <div className="space-y-3 rounded-md bg-muted p-3">
            {plan.allocations.length ? (
              plan.allocations.map((row) => (
                <div
                  key={`${row.targetType}:${row.targetId}`}
                  className="flex justify-between gap-3 text-sm"
                >
                  <span>
                    {row.label} · {formatDate(row.issuedAt)}
                    <span className="block text-muted-foreground">
                      Ostaje na računu: {formatMoney(Math.max(0, row.remainingAmount - row.amount))}
                    </span>
                  </span>
                  <strong>{formatMoney(row.amount)}</strong>
                </div>
              ))
            ) : (
              <p className="text-sm">
                Nema odgovarajućih dugovanja.{' '}
                {plan.reference && !plan.ignoreReference
                  ? 'Proverite poziv na broj ili izričito odobrite raspored po starosti.'
                  : 'Iznos ostaje neraspoređen.'}
              </p>
            )}
            <p className="text-sm">
              Ukupno za raspoređivanje: {formatMoney(plan.allocatedAmount)} · Neraspoređeno:{' '}
              {formatMoney(plan.remainingAmount)}
            </p>
            <Button
              disabled={busy || !plan.allocations.length}
              onClick={() =>
                void change(() =>
                  confirm.mutateAsync({
                    id: transaction.id,
                    body: { ignoreReference: plan.ignoreReference, token: plan.token },
                  }),
                )
              }
            >
              {confirm.isPending ? 'Čuvanje…' : 'Potvrdi ovaj raspored'}
            </Button>
          </div>
        ) : null}
      </div>
      <div className="space-y-3">
        <h3 className="font-semibold">Postojeća povezivanja</h3>
        {history.isPending ? (
          <p className="text-sm">Učitavanje…</p>
        ) : history.isError ? (
          <ErrorState
            error={history.error}
            title="Povezivanja nisu učitana"
            onRetry={() => void history.refetch()}
          />
        ) : (
          <>
            {!history.data.allocations.length ? (
              <p className="text-muted-foreground text-sm">
                Uplata još nije povezana sa dugovanjem.
              </p>
            ) : (
              <>
                <Label htmlFor={`allocation-reason-${transaction.id}`}>
                  Razlog poništavanja povezivanja
                </Label>
                <Input
                  id={`allocation-reason-${transaction.id}`}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  disabled={busy}
                  placeholder="Obavezan razlog"
                />
                {history.data.allocations.map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-3 text-sm">
                    <span>
                      {row.label} · {formatMoney(row.amount)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || reason.trim().length < 3}
                      onClick={() =>
                        void change(() =>
                          reverse.mutateAsync({ id: transaction.id, allocationId: row.id, reason }),
                        )
                      }
                    >
                      Poništi povezivanje
                    </Button>
                  </div>
                ))}
              </>
            )}
            {history.data.history.length ? (
              <details className="text-sm">
                <summary className="cursor-pointer">Istorija promena</summary>
                <ul className="mt-2 space-y-2">
                  {history.data.history.map((event) => (
                    <li key={event.id}>
                      {auditLabels[event.action] ?? event.action} · {event.actor ?? 'Sistem'} ·{' '}
                      {new Date(event.createdAt).toLocaleString('sr-RS')}
                      {event.reason ? ` · ${event.reason}` : ''}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
