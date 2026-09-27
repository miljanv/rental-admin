'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  tripInvoiceWriteSchema,
  tripRouteLabel,
  type TripDto,
  type TripInvoiceWriteInput,
  type TripInvoiceWriteRequest,
} from '@rental-admin/shared';
import { Controller, useForm } from 'react-hook-form';

import { DateField } from '@/components/common/date-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useInvoiceTrip } from '@/features/trips/hooks/use-invoice-trip';
import { localTodayIso } from '@/lib/format';

interface TripInvoiceSheetProps {
  trip: TripDto | null;
  onOpenChange: (open: boolean) => void;
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ id, label, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}

export function TripInvoiceSheet({ trip, onOpenChange }: TripInvoiceSheetProps) {
  const invoiceMutation = useInvoiceTrip(trip?.id ?? '');
  const form = useForm<TripInvoiceWriteInput, unknown, TripInvoiceWriteRequest>({
    resolver: zodResolver(tripInvoiceWriteSchema),
    values: {
      referenceNumber: trip?.referenceNumber ?? '',
      invoicedAt: trip?.invoicedAt ?? localTodayIso(),
      price: trip?.price ?? '',
      paymentMethod: trip?.paymentMethod ?? 'ACCOUNT',
    },
  });

  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    if (!trip) {
      return;
    }

    await invoiceMutation.mutateAsync(values);
    onOpenChange(false);
  });

  return (
    <Sheet open={trip != null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Fakturisanje</SheetTitle>
          <SheetDescription>
            {trip ? tripRouteLabel(trip) : 'Vožnja'}. Iznos ide u finansije kao otvoreno
            potraživanje prema naručiocu. Uplatu kasnije rasknjižavamo kroz izvod.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col gap-4 px-4">
          <Field id="invoice-reference" label="RN broj (opciono)" error={errors.referenceNumber?.message}>
            <Input id="invoice-reference" disabled={invoiceMutation.isPending} {...form.register('referenceNumber')} />
          </Field>
          <Field id="invoice-date" label="Datum fakture" error={errors.invoicedAt?.message}>
            <Controller
              control={form.control}
              name="invoicedAt"
              render={({ field }) => (
                <DateField
                  id="invoice-date"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={invoiceMutation.isPending}
                />
              )}
            />
          </Field>
          <Field id="invoice-price" label="Cena (RSD)" error={errors.price?.message as string | undefined}>
            <Input
              id="invoice-price"
              type="number"
              inputMode="decimal"
              step="0.01"
              disabled={invoiceMutation.isPending}
              {...form.register('price', { valueAsNumber: true })}
            />
          </Field>
          <Controller
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <Field
                id="invoice-payment"
                label="Način plaćanja"
                error={errors.paymentMethod?.message}
              >
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={invoiceMutation.isPending}
                >
                  <SelectTrigger id="invoice-payment" className="w-full">
                    <SelectValue placeholder="Izaberite način" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {PAYMENT_METHOD_LABELS[method]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />

          <SheetFooter className="px-0">
            <Button type="submit" disabled={invoiceMutation.isPending || !trip}>
              {invoiceMutation.isPending ? 'Čuvanje…' : 'Evidentiraj fakturu'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
