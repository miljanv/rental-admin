'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  TRANSPORT_VAT_RATE,
  computeSplitTransportFare,
  invoiceMonthBounds,
  scaleTransportFare,
  tripInvoiceWriteSchema,
  tripRouteLabel,
  type TripDto,
  type TripInvoiceWriteInput,
  type TripInvoiceWriteRequest,
} from '@rental-admin/shared';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { DateField } from '@/components/common/date-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import { useInvoiceTrip } from '@/features/trips/hooks/use-invoice-trip';
import { useTrips } from '@/features/trips/hooks/use-trips';
import { formatMoney, formatMonthYear, localTodayIso } from '@/lib/format';

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

const enteredDomestic = (trip: TripDto): number | '' => {
  if (trip.invoiceDomesticAmount != null) {
    return trip.invoiceDomesticAmount;
  }

  if (trip.priceIncludesVat == null && trip.invoiceNetAmount == null) {
    return trip.price ?? '';
  }

  return trip.priceIncludesVat ? (trip.invoiceGrossAmount ?? trip.price ?? '') : (trip.invoiceNetAmount ?? '');
};

export function TripInvoiceSheet({ trip, onOpenChange }: TripInvoiceSheetProps) {
  const invoiceMutation = useInvoiceTrip(trip?.id ?? '');
  const month = trip ? invoiceMonthBounds(trip.departureDate) : null;
  const form = useForm<TripInvoiceWriteInput, unknown, TripInvoiceWriteRequest>({
    resolver: zodResolver(tripInvoiceWriteSchema),
    values: {
      referenceNumber: trip?.referenceNumber ?? '',
      invoicedAt: trip?.invoicedAt ?? localTodayIso(),
      description: trip?.invoiceDescription ?? '',
      domesticPrice: trip ? enteredDomestic(trip) : '',
      foreignPrice: trip?.invoiceForeignAmount ?? '',
      priceIncludesVat: trip?.priceIncludesVat ?? false,
      billSeriesMonth: Boolean(trip?.seriesId),
      paymentMethod: trip?.paymentMethod ?? 'ACCOUNT',
    },
  });

  const billSeriesMonth = useWatch({ control: form.control, name: 'billSeriesMonth' });
  const priceIncludesVat = useWatch({ control: form.control, name: 'priceIncludesVat' });
  const domesticPrice = useWatch({ control: form.control, name: 'domesticPrice' });
  const foreignPrice = useWatch({ control: form.control, name: 'foreignPrice' });
  const seriesQuery = useTrips(
    {
      page: 1,
      limit: 100,
      sortBy: 'departureDate',
      sortOrder: 'asc',
      seriesId: trip?.seriesId ?? undefined,
      from: month?.from,
      to: month?.to,
    },
    Boolean(trip?.seriesId) && Boolean(billSeriesMonth),
  );
  const seriesDays =
    seriesQuery.data?.trips.filter((row) => row.status !== 'CANCELLED' && row.status !== 'FREE' && !row.paidAt)
      .length ?? 0;
  const dayCount = billSeriesMonth ? seriesDays : 1;
  const typedDomestic = typeof domesticPrice === 'number' ? domesticPrice : 0;
  const typedForeign = typeof foreignPrice === 'number' ? foreignPrice : 0;
  const unitFare =
    (Number.isFinite(typedDomestic) && typedDomestic > 0) ||
    (Number.isFinite(typedForeign) && typedForeign > 0)
      ? computeSplitTransportFare({
          domesticAmount: Number.isFinite(typedDomestic) ? typedDomestic : 0,
          domesticIncludesVat: Boolean(priceIncludesVat),
          foreignAmount: Number.isFinite(typedForeign) ? typedForeign : 0,
        })
      : null;
  const preview = unitFare && dayCount > 0 ? scaleTransportFare(unitFare, dayCount) : null;
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
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Fakturisanje</SheetTitle>
          <SheetDescription>
            {trip ? tripRouteLabel(trip) : 'Vožnja'}. PDV {TRANSPORT_VAT_RATE}% ide samo na cenu u
            zemlji. Cena u inostranstvu je uvek bez PDV-a. Ukupno je zbir ta dva.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col gap-4 px-4 pb-4">
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
          <Field
            id="invoice-description"
            label="Opis"
            error={errors.description?.message}
          >
            <Textarea
              id="invoice-description"
              rows={3}
              placeholder="Šta se fakturiše: relacija, period, putnici."
              disabled={invoiceMutation.isPending}
              {...form.register('description')}
            />
          </Field>

          {trip?.seriesId ? (
            <Controller
              control={form.control}
              name="billSeriesMonth"
              render={({ field }) => (
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={Boolean(field.value)}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    disabled={invoiceMutation.isPending}
                  />
                  <span>
                    Prevoz radnika: fakturiši ceo mesec
                    {month ? ` (${formatMonthYear(month.year, month.month)})` : ''}. Obe cene su iznos
                    po danu.
                  </span>
                </label>
              )}
            />
          ) : null}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              {billSeriesMonth ? 'Cena u zemlji, po danu' : 'Cena u zemlji'}
            </legend>
            <Controller
              control={form.control}
              name="priceIncludesVat"
              render={({ field }) => (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={field.value ? 'outline' : 'default'}
                    onClick={() => field.onChange(false)}
                  >
                    Bez PDV-a
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={field.value ? 'default' : 'outline'}
                    onClick={() => field.onChange(true)}
                  >
                    Sa PDV-om
                  </Button>
                </div>
              )}
            />
            <Field
              id="invoice-domestic-price"
              label="Iznos (RSD)"
              error={errors.domesticPrice?.message as string | undefined}
            >
              <Input
                id="invoice-domestic-price"
                type="number"
                inputMode="decimal"
                step="0.01"
                disabled={invoiceMutation.isPending}
                {...form.register('domesticPrice', { valueAsNumber: true })}
              />
            </Field>
          </fieldset>

          <Field
            id="invoice-foreign-price"
            label={
              billSeriesMonth
                ? 'Cena u inostranstvu, po danu (RSD, bez PDV-a)'
                : 'Cena u inostranstvu (RSD, bez PDV-a)'
            }
            error={errors.foreignPrice?.message as string | undefined}
          >
            <Input
              id="invoice-foreign-price"
              type="number"
              inputMode="decimal"
              step="0.01"
              disabled={invoiceMutation.isPending}
              {...form.register('foreignPrice', { valueAsNumber: true })}
            />
          </Field>

          <Controller
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <Field id="invoice-payment" label="Način plaćanja" error={errors.paymentMethod?.message}>
                <Select value={field.value} onValueChange={field.onChange} disabled={invoiceMutation.isPending}>
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

          {billSeriesMonth && seriesQuery.isPending ? (
            <p className="text-muted-foreground text-sm">Brojanje vožnji u mesecu…</p>
          ) : null}

          {preview ? (
            <div className="bg-muted/50 space-y-1 rounded-lg px-3 py-2 text-sm">
              {billSeriesMonth ? <p>{dayCount} dana</p> : null}
              <p>Zemlja sa PDV-om: {formatMoney(preview.domesticGross)}</p>
              <p>
                PDV {TRANSPORT_VAT_RATE}%: {formatMoney(preview.vatAmount)}
              </p>
              <p>Inostranstvo bez PDV-a: {formatMoney(preview.foreignNet)}</p>
              <p className="font-medium">Ukupno: {formatMoney(preview.grossAmount)}</p>
              {billSeriesMonth ? (
                <p className="text-muted-foreground text-xs">
                  U finansijama je jedan račun za ceo mesec. Na rasporedu svaki dan pokazuje iznos tog dana.
                </p>
              ) : null}
            </div>
          ) : null}

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
