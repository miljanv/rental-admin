'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  TRANSPORT_VAT_RATE,
  computeTransportVat,
  domesticKmShare,
  invoiceMonthBounds,
  isDomesticCountry,
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

const enteredPrice = (trip: TripDto): number | '' => {
  if (trip.priceIncludesVat == null && trip.invoiceNetAmount == null) {
    return trip.price ?? '';
  }

  return trip.priceIncludesVat ? (trip.invoiceGrossAmount ?? trip.price ?? '') : (trip.invoiceNetAmount ?? '');
};

export function TripInvoiceSheet({ trip, onOpenChange }: TripInvoiceSheetProps) {
  const invoiceMutation = useInvoiceTrip(trip?.id ?? '');
  const domestic = trip ? isDomesticCountry(trip.country) : true;
  const month = trip ? invoiceMonthBounds(trip.departureDate) : null;
  const form = useForm<TripInvoiceWriteInput, unknown, TripInvoiceWriteRequest>({
    resolver: zodResolver(tripInvoiceWriteSchema),
    values: {
      referenceNumber: trip?.referenceNumber ?? '',
      invoicedAt: trip?.invoicedAt ?? localTodayIso(),
      description: trip?.invoiceDescription ?? '',
      price: trip ? enteredPrice(trip) : '',
      priceIncludesVat: trip?.priceIncludesVat ?? false,
      domesticKm: trip?.invoiceDomesticKm ?? '',
      totalKm: trip?.invoiceTotalKm ?? '',
      billSeriesMonth: Boolean(trip?.seriesId),
      paymentMethod: trip?.paymentMethod ?? 'ACCOUNT',
    },
  });

  const billSeriesMonth = useWatch({ control: form.control, name: 'billSeriesMonth' });
  const priceIncludesVat = useWatch({ control: form.control, name: 'priceIncludesVat' });
  const price = useWatch({ control: form.control, name: 'price' });
  const domesticKm = useWatch({ control: form.control, name: 'domesticKm' });
  const totalKm = useWatch({ control: form.control, name: 'totalKm' });
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
  const typedAmount = typeof price === 'number' ? price : Number.NaN;
  const share = domestic ? 1 : domesticKmShare(Number(domesticKm), Number(totalKm));
  const unitFare =
    share != null && Number.isFinite(typedAmount) && typedAmount > 0
      ? computeTransportVat({
          amount: typedAmount,
          priceIncludesVat: Boolean(priceIncludesVat),
          domesticShare: share,
        })
      : null;
  const preview =
    unitFare && dayCount > 0
      ? {
          netAmount: Math.round(unitFare.netAmount * dayCount * 100) / 100,
          vatBase: Math.round(unitFare.vatBase * dayCount * 100) / 100,
          vatAmount: Math.round(unitFare.vatAmount * dayCount * 100) / 100,
          grossAmount: Math.round(unitFare.grossAmount * dayCount * 100) / 100,
        }
      : null;
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
            {trip ? tripRouteLabel(trip) : 'Vožnja'}. PDV je {TRANSPORT_VAT_RATE}% i ide samo na
            kilometre u Srbiji. U finansije ide iznos za naplatu.
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
                    {month ? ` (${formatMonthYear(month.year, month.month)})` : ''}. Cena je iznos po
                    danu, broj dana je broj vožnji serije u tom mesecu.
                  </span>
                </label>
              )}
            />
          ) : null}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Cena je</legend>
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
          </fieldset>

          <Field
            id="invoice-price"
            label={billSeriesMonth ? 'Cena po danu (RSD)' : 'Cena (RSD)'}
            error={errors.price?.message as string | undefined}
          >
            <Input
              id="invoice-price"
              type="number"
              inputMode="decimal"
              step="0.01"
              disabled={invoiceMutation.isPending}
              {...form.register('price', { valueAsNumber: true })}
            />
          </Field>

          {domestic ? (
            <p className="text-muted-foreground text-xs">
              {trip?.country
                ? 'Država je Srbija, pa se PDV računa na celu cenu.'
                : 'Država nije uneta, pa se prevoz računa kao domaći i PDV ide na celu cenu.'}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                id="invoice-domestic-km"
                label="Km u Srbiji"
                error={errors.domesticKm?.message as string | undefined}
              >
                <Input
                  id="invoice-domestic-km"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  disabled={invoiceMutation.isPending}
                  {...form.register('domesticKm', { valueAsNumber: true })}
                />
              </Field>
              <Field
                id="invoice-total-km"
                label="Km ukupno"
                error={errors.totalKm?.message as string | undefined}
              >
                <Input
                  id="invoice-total-km"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  disabled={invoiceMutation.isPending}
                  {...form.register('totalKm', { valueAsNumber: true })}
                />
              </Field>
              <p className="text-muted-foreground text-xs sm:col-span-2">
                Inostrani kilometri ostaju bez PDV-a. Oporezuje se samo udeo kilometara u Srbiji.
              </p>
            </div>
          )}

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
              {billSeriesMonth ? (
                <p>
                  {dayCount} dana × {formatMoney(typedAmount)}
                </p>
              ) : null}
              <p>Osnovica: {formatMoney(preview.netAmount)}</p>
              <p>
                PDV {TRANSPORT_VAT_RATE}% na {formatMoney(preview.vatBase)}: {formatMoney(preview.vatAmount)}
              </p>
              <p className="font-medium">Za naplatu: {formatMoney(preview.grossAmount)}</p>
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
