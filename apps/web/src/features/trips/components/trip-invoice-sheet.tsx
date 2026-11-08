'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  CURRENCIES,
  CURRENCY_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  TRANSPORT_VAT_RATE,
  computeCurrencyTransportFare,
  computeSplitTransportFare,
  invoiceMonthBounds,
  scaleTransportFare,
  tripInvoiceWriteSchema,
  tripRouteLabel,
  type TripDto,
  type TripInvoiceWriteInput,
  type TripInvoiceWriteRequest,
} from '@rental-admin/shared';
import { useEffect } from 'react';
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
import { formatEuro, formatMoney, formatMonthYear, localTodayIso } from '@/lib/format';

/** Kinds of re-invoiced costs; stored as the extra cost description. */
const DEFAULT_EXTRA_COST = 'Putarina';
const EXTRA_COST_PRESETS: readonly string[] = [DEFAULT_EXTRA_COST, 'Parking', 'Trajekt'];
/** Any description outside the presets is a custom one typed by the user. */
const CUSTOM_EXTRA_COST = 'Ostalo';

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

const rateFormatter = new Intl.NumberFormat('sr-Latn', { maximumFractionDigits: 4 });

const enteredDomestic = (trip: TripDto): number | '' => {
  if (trip.invoiceDomesticAmount != null) {
    return trip.invoiceDomesticAmount;
  }

  if (trip.priceIncludesVat == null && trip.invoiceNetAmount == null) {
    return trip.price ?? '';
  }

  return trip.priceIncludesVat
    ? (trip.invoiceGrossAmount ?? trip.price ?? '')
    : (trip.invoiceNetAmount ?? '');
};

const defaultInvoiceSupplyDate = (trip: TripDto | null): string => {
  if (!trip) {
    return localTodayIso();
  }

  if (trip.invoiceSupplyDate) {
    return trip.invoiceSupplyDate;
  }

  if (trip.seriesId) {
    return invoiceMonthBounds(trip.departureDate).to;
  }

  return trip.returnDate ?? trip.departureDate;
};

const invoiceFormValues = (trip: TripDto | null): TripInvoiceWriteInput => ({
  referenceNumber: trip?.referenceNumber ?? '',
  invoicedAt:
    (trip?.paymentMethod === 'CASH' ? trip.cashRecordedAt : trip?.invoicedAt) ?? localTodayIso(),
  supplyDate: trip?.paymentMethod === 'CASH' ? '' : defaultInvoiceSupplyDate(trip),
  description:
    (trip?.paymentMethod === 'CASH' ? trip.cashDescription : trip?.invoiceDescription) ?? '',
  domesticPrice: trip ? enteredDomestic(trip) : '',
  foreignPrice: trip?.invoiceForeignAmount ?? '',
  priceIncludesVat: trip?.priceIncludesVat ?? false,
  billSeriesMonth: Boolean(trip?.seriesId && trip.paymentMethod !== 'CASH'),
  paymentMethod: trip?.paymentMethod ?? 'ACCOUNT',
  cashRecipient: trip?.cashRecipient ?? '',
  currency: trip?.invoiceCurrency ?? 'RSD',
  exchangeRate: trip?.invoiceExchangeRate ?? '',
  extraAmount: trip?.invoiceExtraAmount ?? '',
  extraDescription: trip?.invoiceExtraDescription ?? DEFAULT_EXTRA_COST,
});

export function TripInvoiceSheet({ trip, onOpenChange }: TripInvoiceSheetProps) {
  const invoiceMutation = useInvoiceTrip(trip?.id ?? '');
  const month = trip ? invoiceMonthBounds(trip.departureDate) : null;
  const form = useForm<TripInvoiceWriteInput, unknown, TripInvoiceWriteRequest>({
    resolver: zodResolver(tripInvoiceWriteSchema),
    defaultValues: invoiceFormValues(trip),
  });

  useEffect(() => {
    form.reset(invoiceFormValues(trip));
  }, [form, trip]);

  const billSeriesMonth = useWatch({ control: form.control, name: 'billSeriesMonth' });
  const priceIncludesVat = useWatch({ control: form.control, name: 'priceIncludesVat' });
  const domesticPrice = useWatch({ control: form.control, name: 'domesticPrice' });
  const foreignPrice = useWatch({ control: form.control, name: 'foreignPrice' });
  const extraAmountValue = useWatch({ control: form.control, name: 'extraAmount' });
  const extraDescription = useWatch({ control: form.control, name: 'extraDescription' });
  const isCustomExtra = !EXTRA_COST_PRESETS.includes(extraDescription ?? '');
  const paymentMethod = useWatch({ control: form.control, name: 'paymentMethod' });
  const currency = useWatch({ control: form.control, name: 'currency' }) ?? 'RSD';
  const exchangeRateValue = useWatch({ control: form.control, name: 'exchangeRate' });
  const isCash = paymentMethod === 'CASH';
  const canUseForeign = !isCash && !billSeriesMonth;
  const isForeign = canUseForeign && currency !== 'RSD';
  const exchangeRate =
    typeof exchangeRateValue === 'number' &&
    Number.isFinite(exchangeRateValue) &&
    exchangeRateValue > 0
      ? exchangeRateValue
      : null;
  const formatTyped = isForeign ? formatEuro : formatMoney;
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
    Boolean(trip?.seriesId) && Boolean(billSeriesMonth) && !isCash,
  );
  const seriesDays =
    seriesQuery.data?.trips.filter(
      (row) => row.status !== 'CANCELLED' && row.status !== 'FREE' && !row.paidAt,
    ).length ?? 0;
  const dayCount = billSeriesMonth ? seriesDays : 1;
  const typedDomestic = typeof domesticPrice === 'number' ? domesticPrice : 0;
  const typedForeign = typeof foreignPrice === 'number' ? foreignPrice : 0;
  // Tolls are a per-invoice amount; a monthly series invoice has none.
  const typedExtra =
    !billSeriesMonth && typeof extraAmountValue === 'number' && Number.isFinite(extraAmountValue)
      ? Math.max(0, extraAmountValue)
      : 0;
  const unitFare =
    (Number.isFinite(typedDomestic) && typedDomestic > 0) ||
    (Number.isFinite(typedForeign) && typedForeign > 0)
      ? computeSplitTransportFare({
          domesticAmount: Number.isFinite(typedDomestic) ? typedDomestic : 0,
          domesticIncludesVat: isCash ? false : Boolean(priceIncludesVat),
          foreignAmount: Number.isFinite(typedForeign) ? typedForeign : 0,
          extraAmount: typedExtra,
        })
      : null;
  const preview = unitFare && dayCount > 0 ? scaleTransportFare(unitFare, dayCount) : null;
  // Dinar figures of an EUR invoice: each line converted at the invoice rate, VAT in dinars.
  const dinarFare =
    isForeign && unitFare && exchangeRate
      ? computeCurrencyTransportFare({
          domesticAmount: Number.isFinite(typedDomestic) ? typedDomestic : 0,
          domesticIncludesVat: Boolean(priceIncludesVat),
          foreignAmount: Number.isFinite(typedForeign) ? typedForeign : 0,
          extraAmount: typedExtra,
          exchangeRate,
        }).dinars
      : null;
  const errors = form.formState.errors;

  // Cash trips and monthly series invoices are always in dinars.
  useEffect(() => {
    if (!canUseForeign && currency !== 'RSD') {
      form.setValue('currency', 'RSD');
    }
  }, [canUseForeign, currency, form]);

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
          <SheetTitle>{isCash ? 'Evidencija keš vožnje' : 'Fakturisanje'}</SheetTitle>
          <SheetDescription>
            {trip ? tripRouteLabel(trip) : 'Vožnja'}.{' '}
            {isCash
              ? 'Keš vožnja se vodi samo u internoj keš evidenciji i ne ulazi u zvanične finansije.'
              : `PDV ${TRANSPORT_VAT_RATE}% ide samo na cenu u zemlji. Cena u inostranstvu je uvek bez PDV-a. Ukupno je zbir ta dva.`}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col gap-4 px-4 pb-4">
          <Field
            id="invoice-reference"
            label="RN broj (opciono)"
            error={errors.referenceNumber?.message}
          >
            <Input
              id="invoice-reference"
              disabled={invoiceMutation.isPending}
              {...form.register('referenceNumber')}
            />
          </Field>
          <Field
            id="invoice-date"
            label={isCash ? 'Datum evidencije' : 'Datum fakture'}
            error={errors.invoicedAt?.message}
          >
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
          {!isCash ? (
            <Field
              id="invoice-supply-date"
              label="Datum prometa"
              error={errors.supplyDate?.message}
            >
              <Controller
                control={form.control}
                name="supplyDate"
                render={({ field }) => (
                  <DateField
                    id="invoice-supply-date"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    disabled={invoiceMutation.isPending}
                  />
                )}
              />
              <p className="text-muted-foreground text-xs">
                PDV se prikazuje u mesecu ovog datuma, nezavisno od datuma fakture.
              </p>
            </Field>
          ) : null}
          <Field id="invoice-description" label="Napomena" error={errors.description?.message}>
            <Textarea
              id="invoice-description"
              rows={3}
              placeholder="Detalji fakture: relacija, kilometri, period, vozila."
              disabled={invoiceMutation.isPending}
              {...form.register('description')}
            />
          </Field>

          {trip?.seriesId && !isCash ? (
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
                    {month ? ` (${formatMonthYear(month.year, month.month)})` : ''}. Obe cene su
                    iznos po danu.
                  </span>
                </label>
              )}
            />
          ) : null}

          {canUseForeign || !billSeriesMonth ? (
            <div className="grid grid-cols-3 items-start gap-2">
              {canUseForeign ? (
                <Controller
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <Field
                      id="invoice-currency"
                      label="Valuta fakture"
                      error={errors.currency?.message}
                    >
                      <Select
                        value={field.value ?? 'RSD'}
                        onValueChange={field.onChange}
                        disabled={invoiceMutation.isPending}
                      >
                        <SelectTrigger id="invoice-currency" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((value) => (
                            <SelectItem key={value} value={value}>
                              {CURRENCY_LABELS[value]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
              ) : null}
              {!billSeriesMonth ? (
                <>
                  <Controller
                    control={form.control}
                    name="extraDescription"
                    render={({ field }) => {
                      const value = EXTRA_COST_PRESETS.includes(field.value ?? '')
                        ? (field.value ?? DEFAULT_EXTRA_COST)
                        : CUSTOM_EXTRA_COST;

                      return (
                        <Field
                          id="invoice-extra-description"
                          label="Dodatni troškovi"
                          error={isCustomExtra ? undefined : errors.extraDescription?.message}
                        >
                          <Select
                            value={value}
                            onValueChange={(next) =>
                              field.onChange(next === CUSTOM_EXTRA_COST ? '' : next)
                            }
                            disabled={invoiceMutation.isPending}
                          >
                            <SelectTrigger id="invoice-extra-description" className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[...EXTRA_COST_PRESETS, CUSTOM_EXTRA_COST].map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      );
                    }}
                  />
                  <Field
                    id="invoice-extra-amount"
                    label={`Iznos${isForeign ? ' (EUR)' : ''}`}
                    error={errors.extraAmount?.message as string | undefined}
                  >
                    <Input
                      id="invoice-extra-amount"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="0,00"
                      disabled={invoiceMutation.isPending}
                      aria-invalid={Boolean(errors.extraAmount)}
                      {...form.register('extraAmount', { valueAsNumber: true })}
                    />
                  </Field>
                  {isCustomExtra ? (
                    <div className="col-span-3">
                      <Field
                        id="invoice-extra-custom"
                        label="Opis dodatnih troškova"
                        error={errors.extraDescription?.message}
                      >
                        <Input
                          id="invoice-extra-custom"
                          placeholder="npr. vinjeta, pranje vozila"
                          value={extraDescription ?? ''}
                          onChange={(event) =>
                            form.setValue('extraDescription', event.target.value, {
                              shouldDirty: true,
                              shouldValidate: form.formState.isSubmitted,
                            })
                          }
                          disabled={invoiceMutation.isPending}
                        />
                      </Field>
                    </div>
                  ) : null}
                  <p className="text-muted-foreground col-span-3 text-xs">
                    Dodatni troškovi (putarine i sl.) ulaze u iznos fakture i promet, ali ne i u PDV
                    obračun.
                  </p>
                </>
              ) : null}
              {isForeign ? (
                <Field
                  id="invoice-exchange-rate"
                  label="Kurs sa fakture"
                  error={errors.exchangeRate?.message}
                >
                  <Input
                    id="invoice-exchange-rate"
                    type="number"
                    inputMode="decimal"
                    step="0.0001"
                    placeholder="npr. 117,4007"
                    disabled={invoiceMutation.isPending}
                    aria-invalid={Boolean(errors.exchangeRate)}
                    {...form.register('exchangeRate', { valueAsNumber: true })}
                  />
                </Field>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-3 items-start gap-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="invoice-domestic-price" className="leading-tight">
                Cena u zemlji{isForeign ? ' (EUR)' : ''}
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
              {isCash ? (
                <p className="text-muted-foreground text-xs leading-tight">
                  Interna evidencija, bez obračuna PDV-a
                </p>
              ) : (
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
              )}
              {unitFare && !isCash ? (
                <p className="text-muted-foreground text-xs leading-tight">
                  Sa PDV-om: {formatTyped(unitFare.domesticGross)}
                </p>
              ) : null}
              {errors.domesticPrice?.message ? (
                <p className="text-destructive text-xs">{errors.domesticPrice.message as string}</p>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="invoice-foreign-price" className="leading-tight">
                Cena u inostranstvu{isForeign ? ' (EUR)' : ''}
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
                {unitFare ? formatTyped(unitFare.grossAmount) : '—'}
              </div>
              <p className="text-muted-foreground text-xs leading-tight">
                {dinarFare
                  ? `= ${formatMoney(dinarFare.grossAmount)}`
                  : typedExtra > 0
                    ? 'Zbir cena i dodatnih troškova'
                    : 'Zbir te dve cene'}
              </p>
              {billSeriesMonth && dayCount > 0 ? (
                <p className="text-muted-foreground text-xs">{dayCount} dana</p>
              ) : null}
            </div>
          </div>

          {isForeign && unitFare ? (
            <p className="border-primary/40 bg-primary/5 text-foreground rounded-lg border px-3 py-2 text-sm font-semibold">
              {dinarFare
                ? `U dinarima po kursu ${rateFormatter.format(exchangeRate ?? 0)}: osnovica u zemlji ${formatMoney(dinarFare.domesticNet)}, PDV ${TRANSPORT_VAT_RATE}% ${formatMoney(dinarFare.vatAmount)}, inostranstvo ${formatMoney(dinarFare.foreignNet)}${dinarFare.extraAmount > 0 ? `, dodatni troškovi ${formatMoney(dinarFare.extraAmount)} (bez PDV-a)` : ''}, ukupno ${formatMoney(dinarFare.grossAmount)}. Ovi dinarski iznosi idu u PDV obračun i zaduženja.`
                : 'Unesite kurs sa fakture da biste videli dinarske iznose i PDV.'}
            </p>
          ) : unitFare && !isCash ? (
            <p className="border-primary/40 bg-primary/5 text-foreground rounded-lg border px-3 py-2 text-sm font-semibold">
              PDV {TRANSPORT_VAT_RATE}% na zemlju: {formatMoney(unitFare.vatAmount)}. Ukupno je
              zemlja sa PDV-om ({formatMoney(unitFare.domesticGross)}) + inostranstvo (
              {formatMoney(unitFare.foreignNet)})
              {unitFare.extraAmount > 0
                ? ` + dodatni troškovi (${formatMoney(unitFare.extraAmount)}, bez PDV-a)`
                : ''}
              .
              {billSeriesMonth && preview && dayCount > 1
                ? ` Za ${dayCount} dana: ${formatMoney(preview.grossAmount)}.`
                : ''}
            </p>
          ) : null}

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
                  onValueChange={(value) => {
                    field.onChange(value);
                    if (value === 'CASH') {
                      form.setValue('billSeriesMonth', false);
                      form.setValue('priceIncludesVat', false);
                      form.setValue('supplyDate', '');
                    } else if (!form.getValues('supplyDate')) {
                      form.setValue('supplyDate', defaultInvoiceSupplyDate(trip));
                    }
                  }}
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

          {isCash ? (
            <Field
              id="invoice-cash-recipient"
              label="Keš ide kod osobe"
              error={errors.cashRecipient?.message}
            >
              <Input
                id="invoice-cash-recipient"
                placeholder="Ime i prezime osobe"
                disabled={invoiceMutation.isPending}
                {...form.register('cashRecipient')}
              />
            </Field>
          ) : null}

          {billSeriesMonth && seriesQuery.isPending ? (
            <p className="text-muted-foreground text-sm">Brojanje vožnji u mesecu…</p>
          ) : null}
          {billSeriesMonth && !seriesQuery.isPending ? (
            <p className="text-muted-foreground text-xs">
              U finansijama je jedan račun za ceo mesec. Na rasporedu svaki dan pokazuje iznos tog
              dana.
            </p>
          ) : null}

          <SheetFooter className="px-0">
            <Button type="submit" disabled={invoiceMutation.isPending || !trip}>
              {invoiceMutation.isPending
                ? 'Čuvanje…'
                : isCash
                  ? 'Evidentiraj keš vožnju'
                  : 'Evidentiraj fakturu'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
