'use client';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  openingBalanceWriteSchema,
  type CounterpartyRequest,
  type OpeningBalanceDto,
  type OpeningBalanceWriteRequest,
  type OpeningBalanceWriteInput,
  type TransactionDto,
} from '@rental-admin/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateField } from '@/components/common/date-field';
import { ErrorState } from '@/components/common/error-state';
import {
  useOpeningBalances,
  useSaveOpeningBalance,
  useConfirmOpeningBalance,
  useReverseOpeningBalance,
} from '../hooks/use-payment-settlement';
import { PaymentAllocationPanel } from './payment-allocation-panel';
import { formatDate, formatMoney, localTodayIso } from '@/lib/format';

function OpeningDraftForm({
  party,
  record,
  onDone,
}: {
  party: CounterpartyRequest;
  record?: OpeningBalanceDto;
  onDone: () => void;
}) {
  const save = useSaveOpeningBalance();
  const form = useForm<OpeningBalanceWriteInput, unknown, OpeningBalanceWriteRequest>({
    resolver: zodResolver(openingBalanceWriteSchema),
    defaultValues: {
      ...party,
      kind: record?.kind ?? 'DEBT',
      amount: record?.amount ?? 0,
      asOfDate: record?.asOfDate ?? localTodayIso(),
      note: record?.note ?? '',
    },
  });
  const errors = form.formState.errors;
  const submit = form.handleSubmit(async (body) => {
    try {
      await save.mutateAsync({ id: record?.id, body });
      onDone();
    } catch {
      /* Reported by mutation. */
    }
  });
  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor={`opening-kind-${party.partyId}`}>Vrsta stanja</Label>
          <select
            id={`opening-kind-${party.partyId}`}
            className="border-input h-9 w-full rounded-md border bg-background px-2 text-sm"
            {...form.register('kind')}
            disabled={save.isPending}
          >
            <option value="DEBT">
              {party.partyType === 'PARTNER' ? 'Kupac nam duguje' : 'Dugujemo dobavljaču'}
            </option>
            <option value="CREDIT">
              {party.partyType === 'PARTNER'
                ? 'Kupac ima pretplatu kod nas'
                : 'Imamo pretplatu kod dobavljača'}
            </option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`opening-amount-${party.partyId}`}>Iznos (RSD)</Label>
          <Input
            id={`opening-amount-${party.partyId}`}
            type="number"
            step="0.01"
            {...form.register('amount', { valueAsNumber: true })}
            disabled={save.isPending}
          />
          {errors.amount ? (
            <p className="text-sm text-destructive">{errors.amount.message}</p>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`opening-date-${party.partyId}`}>Stanje zaključno sa datumom</Label>
          <Controller
            control={form.control}
            name="asOfDate"
            render={({ field }) => (
              <DateField
                id={`opening-date-${party.partyId}`}
                value={field.value}
                onChange={field.onChange}
                disabled={save.isPending}
              />
            )}
          />
          {errors.asOfDate ? (
            <p className="text-sm text-destructive">{errors.asOfDate.message}</p>
          ) : null}
        </div>
      </div>
      <Label htmlFor={`opening-note-${party.partyId}`}>Napomena / poreklo stanja</Label>
      <Input
        id={`opening-note-${party.partyId}`}
        {...form.register('note')}
        disabled={save.isPending}
      />
      {errors.note ? <p className="text-sm text-destructive">{errors.note.message}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Čuvanje…' : 'Sačuvaj nacrt'}
        </Button>
        <Button type="button" variant="outline" onClick={onDone} disabled={save.isPending}>
          Otkaži
        </Button>
      </div>
    </form>
  );
}

export function OpeningBalancePanel({ party }: { party: CounterpartyRequest }) {
  const query = useOpeningBalances(party);
  const confirm = useConfirmOpeningBalance();
  const reverse = useReverseOpeningBalance();
  const [editing, setEditing] = useState(false);
  const [acknowledge, setAcknowledge] = useState(false);
  const [reason, setReason] = useState('');
  const [payment, setPayment] = useState<TransactionDto | null>(null);
  const active = query.data?.find((row) => row.status !== 'REVERSED');
  const busy = confirm.isPending || reverse.isPending;
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Početno stanje</CardTitle>
        <CardDescription>
          Prenesite dug ili pretplatu iz perioda pre korišćenja aplikacije. Unesite neto stanje koje
          nije već evidentirano kroz postojeće račune i uplate. Nacrt ne utiče na saldo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isPending ? (
          <p className="text-sm">Učitavanje početnog stanja…</p>
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            title="Početno stanje nije učitano"
            onRetry={() => void query.refetch()}
          />
        ) : (
          <>
            {editing ? (
              <OpeningDraftForm
                party={party}
                record={active?.status === 'DRAFT' ? active : undefined}
                onDone={() => {
                  setEditing(false);
                  setAcknowledge(false);
                }}
              />
            ) : active ? (
              <div className="space-y-3">
                <p>
                  <strong>
                    {active.kind === 'DEBT' ? 'Početni dug' : 'Početna pretplata'}:{' '}
                    {formatMoney(active.amount)}
                  </strong>{' '}
                  · {formatDate(active.asOfDate)} ·{' '}
                  {active.status === 'DRAFT' ? 'Nacrt' : 'Potvrđeno i zaključano'}
                </p>
                {active.note ? (
                  <p className="text-sm text-muted-foreground">{active.note}</p>
                ) : null}
                {active.status === 'DRAFT' ? (
                  <>
                    <label className="flex items-start gap-2 text-sm">
                      <Checkbox
                        checked={acknowledge}
                        onCheckedChange={(value) => setAcknowledge(value === true)}
                        disabled={busy}
                      />
                      Proverio/la sam datum i iznos. Ovo stanje nije već uključeno u račune ili
                      uplate u aplikaciji. Potvrđen zapis se menja samo storniranjem uz razlog.
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" disabled={busy} onClick={() => setEditing(true)}>
                        Izmeni nacrt
                      </Button>
                      <Button
                        disabled={busy || !acknowledge}
                        onClick={() =>
                          confirm.mutate(active.id, { onSuccess: () => setAcknowledge(false) })
                        }
                      >
                        {confirm.isPending ? 'Potvrđivanje…' : 'Potvrdi početno stanje'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm">
                      Raspoređeno: {formatMoney(active.allocatedAmount)} · Preostalo:{' '}
                      {formatMoney(active.remainingAmount)}
                    </p>
                    {active.creditTransaction ? (
                      <Button
                        variant="outline"
                        onClick={() => setPayment(active.creditTransaction)}
                      >
                        Rasporedi pretplatu / pregled povezivanja
                      </Button>
                    ) : null}
                    {active.payments.map((row) => (
                      <div key={row.id} className="flex items-center justify-between gap-2 text-sm">
                        <span>
                          Uplata {formatDate(row.occurredAt)} · {formatMoney(row.amount)}
                        </span>
                        <Button size="sm" variant="outline" onClick={() => setPayment(row)}>
                          Povezivanja
                        </Button>
                      </div>
                    ))}
                    <details>
                      <summary className="cursor-pointer text-sm">Ispravka početnog stanja</summary>
                      <div className="mt-3 space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Prvo poništite sva povezivanja. Storniranje zadržava original i istoriju,
                          a zatim možete uneti ispravan nacrt.
                        </p>
                        <Label htmlFor={`opening-reason-${party.partyId}`}>
                          Razlog storniranja
                        </Label>
                        <Input
                          id={`opening-reason-${party.partyId}`}
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                          disabled={busy}
                        />
                        <Button
                          variant="destructive"
                          disabled={
                            busy || reason.trim().length < 3 || active.allocatedAmount > 0.005
                          }
                          onClick={() =>
                            reverse.mutate(
                              { id: active.id, reason },
                              {
                                onSuccess: () => {
                                  setReason('');
                                  setPayment(null);
                                },
                              },
                            )
                          }
                        >
                          Storniraj početno stanje
                        </Button>
                      </div>
                    </details>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Početno stanje nije uneto.</p>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  Unesi početno stanje
                </Button>
              </div>
            )}
            {query.data
              ?.filter((row) => row.status === 'REVERSED')
              .map((row) => (
                <p key={row.id} className="text-muted-foreground text-sm">
                  Stornirano {formatMoney(row.amount)} ({formatDate(row.asOfDate)}) ·{' '}
                  {row.reversalReason} ·{' '}
                  {row.reversedAt ? new Date(row.reversedAt).toLocaleString('sr-RS') : ''}
                </p>
              ))}
          </>
        )}
        {query.data?.some((row) => row.history.length) ? (
          <details className="text-sm">
            <summary className="cursor-pointer">Istorija početnog stanja</summary>
            <ul className="mt-2 space-y-2">
              {query.data
                .flatMap((row) => row.history)
                .map((event) => (
                  <li key={event.id}>
                    {{
                      OPENING_DRAFT_CREATED: 'Kreiran nacrt',
                      OPENING_DRAFT_UPDATED: 'Izmenjen nacrt',
                      OPENING_CONFIRMED: 'Potvrđeno stanje',
                      OPENING_REVERSED: 'Stornirano stanje',
                    }[event.action] ?? event.action}{' '}
                    · {event.actor ?? 'Sistem'} ·{' '}
                    {new Date(event.createdAt).toLocaleString('sr-RS')}
                    {event.reason ? ` · ${event.reason}` : ''}
                  </li>
                ))}
            </ul>
          </details>
        ) : null}
        {payment ? (
          <PaymentAllocationPanel
            key={payment.id}
            transaction={payment}
            onDone={() => setPayment(null)}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
