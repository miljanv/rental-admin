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
import { useEffect, useRef } from 'react';
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

const invoiceFormValues = (trip: TripDto | null): TripInvoiceWriteInput => ({
  referenceNumber: trip?.referenceNumber ?? '',
  invoicedAt: trip?.invoicedAt ?? localTodayIso(),
  description: trip?.invoiceDescription ?? '',
  domesticPrice: trip ? enteredDomestic(trip) : '',
  foreignPrice: trip?.invoiceForeignAmount ?? '',
  priceIncludesVat: trip?.priceIncludesVat ?? false,
  billSeriesMonth: Boolean(trip?.seriesId),
  paymentMethod: trip?.paymentMethod ?? 'ACCOUNT',
});

export function TripInvoiceSheet({ trip, onOpenChange }: TripInvoiceSheetProps) {
  const invoiceMutation = useInvoiceTrip(trip?.id ?? '');
  const month = trip ? invoiceMonthBounds(trip.departureDate) : null;
  const tripRef = useRef(trip);
  tripRef.current = trip;
  const form = useForm<TripInvoiceWriteInput, unknown, TripInvoiceWriteRequest>({
    resolver: zodResolver(tripInvoiceWriteSchema),
    defaultValues: invoiceFormValues(trip),
  });

  useEffect(() => {
    form.reset(invoiceFormValues(tripRef.current));
  }, [form, trip?.id]);

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
      <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-3xl">
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
            label="Napomena"
            error={errors.description?.message}
          >
            <Textarea
              id="invoice-description"
              rows={3}
              placeholder="Detalji fakture: relacija, kilometri, period, vozila."
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

          <div className="grid grid-cols-3 items-start gap-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="invoice-domestic-price" className="leading-tight">
                Cena u zemlji
              </Label>
              <Input
                id="invoice-domestic-price"
                type="number"
                inputMode="decimal"
                step="0.01"
                className="min-w-0"
                disabled={invoiceMutation.isPending}
                aria-invalid={Boolean(errors.domesticPrice)}
                {...form.register('domesticPrice', { valueAsNumber: true })}
              />
              <Controller
                control={form.control}
                name="priceIncludesVat"
                render={({ field }) => (
                  <div className="grid grid-cols-1 gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={field.value ? 'outline' : 'default'}
                      className="h-7 w-full shrink px-1 text-xs"
                      onClick={() => field.onChange(false)}
                    >
                      Bez PDV-a
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={field.value ? 'default' : 'outline'}
                      className="h-7 w-full shrink px-1 text-xs"
                      onClick={() => field.onChange(true)}
                    >
                      Sa PDV-om
                    </Button>
                  </div>
                )}
              />
              {unitFare ? (
                <p className="text-muted-foreground text-xs leading-tight">
                  Sa PDV-om: {formatMoney(unitFare.domesticGross)}
                </p>
              ) : null}
              {errors.domesticPrice?.message ? (
                <p className="text-destructive text-xs">{errors.domesticPrice.message as string}</p>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="invoice-foreign-price" className="leading-tight">
                Cena u inostranstvu
              </Label>
              <Input
                id="invoice-foreign-price"
                type="number"
                inputMode="decimal"
                step="0.01"
                className="min-w-0"
                disabled={invoiceMutation.isPending}
                aria-invalid={Boolean(errors.foreignPrice)}
                {...form.register('foreignPrice', { valueAsNumber: true })}
              />
              <p className="text-muted-foreground text-xs leading-tight">Uvek bez PDV-a</p>
              {errors.foreignPrice?.message ? (
                <p className="text-destructive text-xs">{errors.foreignPrice.message as string}</p>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="invoice-total" className="leading-tight">
                Ukupno
              </Label>
              <div
                id="invoice-total"
                className="border-input bg-muted flex h-8 min-w-0 items-center rounded-lg border px-2 text-sm font-medium"
              >
                {unitFare ? formatMoney(unitFare.grossAmount) : '—'}
              </div>
              <p className="text-muted-foreground text-xs leading-tight">Zbir te dve cene</p>
              {billSeriesMonth && dayCount > 0 ? (
                <p className="text-muted-foreground text-xs">{dayCount} dana</p>
              ) : null}
            </div>
          </div>

          {unitFare ? (
            <p className="text-muted-foreground text-xs">
              PDV {TRANSPORT_VAT_RATE}% na zemlju: {formatMoney(unitFare.vatAmount)}. Ukupno je zemlja
              sa PDV-om ({formatMoney(unitFare.domesticGross)}) + inostranstvo (
              {formatMoney(unitFare.foreignNet)}).
              {billSeriesMonth && preview && dayCount > 1
                ? ` Za ${dayCount} dana: ${formatMoney(preview.grossAmount)}.`
                : ''}
            </p>
          ) : null}

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
          {billSeriesMonth && !seriesQuery.isPending ? (
            <p className="text-muted-foreground text-xs">
              U finansijama je jedan račun za ceo mesec. Na rasporedu svaki dan pokazuje iznos tog dana.
            </p>
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
