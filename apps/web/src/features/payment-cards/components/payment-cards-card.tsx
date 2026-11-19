'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  paymentCardWriteSchema,
  type PaymentCardDto,
  type PaymentCardWriteInput,
  type PaymentCardWriteRequest,
} from '@rental-admin/shared';
import { CreditCard } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { usePaymentCards } from '@/features/payment-cards/hooks/use-payment-cards';
import { useSavePaymentCard } from '@/features/payment-cards/hooks/use-save-payment-card';

function PaymentCardRow({ card }: { card: PaymentCardDto }) {
  const save = useSavePaymentCard();
  const [name, setName] = useState(card.name);
  const [editing, setEditing] = useState(false);

  const submit = async (body: PaymentCardWriteRequest) => {
    try {
      await save.mutateAsync({ id: card.id, body });
      setEditing(false);
    } catch {
      // The mutation reports the failure as a toast.
    }
  };

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      {editing ? (
        <Input
          aria-label="Naziv kartice"
          value={name}
          maxLength={60}
          onChange={(event) => setName(event.target.value)}
          className="sm:max-w-xs"
        />
      ) : (
        <span className="flex items-center gap-2 text-sm font-medium">
          {card.name}
          {card.isActive ? null : <Badge variant="secondary">Isključena</Badge>}
        </span>
      )}
      <div className="flex flex-wrap gap-2">
        {editing ? (
          <>
            <Button
              type="button"
              size="sm"
              disabled={save.isPending || name.trim().length < 2}
              onClick={() => void submit({ name, isActive: card.isActive })}
            >
              Sačuvaj
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setName(card.name);
                setEditing(false);
              }}
            >
              Odustani
            </Button>
          </>
        ) : (
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
              Preimenuj
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={save.isPending}
              onClick={() => void submit({ name: card.name, isActive: !card.isActive })}
            >
              {card.isActive ? 'Isključi' : 'Uključi'}
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

/** Company cards drivers pick when an expense was paid by card ("OMV kartica", "EW kartica"). */
export function PaymentCardsCard() {
  const query = usePaymentCards();
  const save = useSavePaymentCard();
  const form = useForm<PaymentCardWriteInput, unknown, PaymentCardWriteRequest>({
    resolver: zodResolver(paymentCardWriteSchema),
    defaultValues: { name: '', isActive: true },
  });

  const onSubmit = async (body: PaymentCardWriteRequest) => {
    try {
      await save.mutateAsync({ body });
      form.reset({ name: '', isActive: true });
    } catch {
      // The mutation reports the failure as a toast.
    }
  };

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Kartice za plaćanje</CardTitle>
        <CardDescription>
          Kartice koje vozač bira kad trošak plati karticom firme, npr. „Kartica firme“, „OMV
          kartica“, „EW kartica“. Isključena kartica se više ne nudi, a stari troškovi je zadržavaju.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="payment-card-name">Nova kartica</Label>
            <Input
              id="payment-card-name"
              placeholder="npr. OMV kartica"
              maxLength={60}
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register('name')}
            />
            {form.formState.errors.name ? (
              <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Čuvanje…' : 'Dodaj karticu'}
          </Button>
        </form>

        {query.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            title="Kartice nisu učitane"
            retryLabel="Pokušaj ponovo"
            retryingLabel="Učitavanje…"
            onRetry={() => void query.refetch()}
            isRetrying={query.isFetching}
          />
        ) : query.data.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Nema kartica"
            description="Bez kartica vozač bira samo „Službena kartica“, bez naziva."
          />
        ) : (
          <ul className="divide-y">
            {query.data.map((card) => (
              <PaymentCardRow key={`${card.id}:${card.name}`} card={card} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
