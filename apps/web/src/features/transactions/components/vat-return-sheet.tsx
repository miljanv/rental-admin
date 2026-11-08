'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  VAT_RETURN_KIND_LABELS,
  VAT_RETURN_KINDS,
  vatReturnWriteSchema,
  type VatMonthlyPoint,
  type VatReturnWriteInput,
  type VatReturnWriteRequest,
} from '@rental-admin/shared';
import { useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { useDeleteVatReturn } from '@/features/transactions/hooks/use-delete-vat-return';
import { useSaveVatReturn } from '@/features/transactions/hooks/use-save-vat-return';
import { formatMoney, formatMonthYear } from '@/lib/format';

interface VatReturnSheetProps {
  month: VatMonthlyPoint | null;
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

/** A new return starts from the app's own calculation; the filed figure can differ. */
const formValues = (month: VatMonthlyPoint | null): VatReturnWriteInput => {
  const existing = month?.vatReturn;

  if (existing) {
    return {
      year: existing.year,
      month: existing.month,
      kind: existing.kind,
      amount: existing.amount,
      documentNumber: existing.documentNumber ?? '',
      filedAt: existing.filedAt ?? '',
      note: existing.note ?? '',
    };
  }

  const balance = month?.balance ?? 0;

  return {
    year: month?.year ?? new Date().getFullYear(),
    month: month?.month ?? 1,
    kind: balance < 0 ? 'REFUND' : 'PAYABLE',
    amount: Math.abs(balance),
    documentNumber: '',
    filedAt: '',
    note: '',
  };
};

export function VatReturnSheet({ month, onOpenChange }: VatReturnSheetProps) {
  const saveMutation = useSaveVatReturn();
  const deleteMutation = useDeleteVatReturn();
  const existing = month?.vatReturn ?? null;
  const isPending = saveMutation.isPending || deleteMutation.isPending;
  const form = useForm<VatReturnWriteInput, unknown, VatReturnWriteRequest>({
    resolver: zodResolver(vatReturnWriteSchema),
    defaultValues: formValues(month),
  });
  const errors = form.formState.errors;

  useEffect(() => {
    form.reset(formValues(month));
  }, [form, month]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await saveMutation.mutateAsync({ id: existing?.id, body: values });
      onOpenChange(false);
    } catch {
      // The mutation reports the failure as a toast.
    }
  });

  const onDelete = async () => {
    if (!existing || !window.confirm('Obrisati PDV prijavu za ovaj mesec?')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(existing.id);
      onOpenChange(false);
    } catch {
      // The mutation reports the failure as a toast.
    }
  };

  return (
    <Sheet open={month != null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            PDV prijava{month ? ` · ${formatMonthYear(month.year, month.month)}` : ''}
          </SheetTitle>
          <SheetDescription>
            Unesite iznos sa podnete poreske prijave. Po obračunu aplikacije razlika je{' '}
            {formatMoney(Math.abs(month?.balance ?? 0))}{' '}
            {(month?.balance ?? 0) < 0 ? 'za povraćaj' : 'za uplatu'}. Uplatu državi ili povraćaj iz
            izvoda zatim povežite sa ovom prijavom.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col gap-4 px-4 pb-4">
          <Controller
            control={form.control}
            name="kind"
            render={({ field }) => (
              <Field id="vat-return-kind" label="Vrsta" error={errors.kind?.message}>
                <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                  <SelectTrigger id="vat-return-kind" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VAT_RETURN_KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {VAT_RETURN_KIND_LABELS[kind]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />

          <Field
            id="vat-return-amount"
            label="Iznos sa prijave (RSD)"
            error={errors.amount?.message}
          >
            <Input
              id="vat-return-amount"
              type="number"
              step="0.01"
              inputMode="decimal"
              disabled={isPending}
              aria-invalid={Boolean(errors.amount)}
              {...form.register('amount', { valueAsNumber: true })}
            />
          </Field>

          <Field
            id="vat-return-number"
            label="Broj prijave (opciono)"
            error={errors.documentNumber?.message}
          >
            <Input
              id="vat-return-number"
              disabled={isPending}
              {...form.register('documentNumber')}
            />
          </Field>

          <Field
            id="vat-return-filed"
            label="Datum podnošenja (opciono)"
            error={errors.filedAt?.message}
          >
            <Controller
              control={form.control}
              name="filedAt"
              render={({ field }) => (
                <DateField
                  id="vat-return-filed"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  disabled={isPending}
                />
              )}
            />
          </Field>

          <Field id="vat-return-note" label="Napomena" error={errors.note?.message}>
            <Textarea
              id="vat-return-note"
              rows={2}
              disabled={isPending}
              {...form.register('note')}
            />
          </Field>

          {existing ? (
            <p className="text-muted-foreground text-sm">
              {existing.kind === 'PAYABLE' ? 'Uplaćeno' : 'Vraćeno'}:{' '}
              {formatMoney(existing.settledAmount)} · Otvoreno: {formatMoney(existing.openAmount)}
            </p>
          ) : null}

          <SheetFooter className="px-0 sm:flex-row sm:justify-between">
            {existing ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void onDelete()}
                disabled={isPending || existing.settledAmount > 0}
                title={
                  existing.settledAmount > 0
                    ? 'Prijava ima povezane uplate; prvo poništite povezivanja.'
                    : undefined
                }
              >
                Obriši prijavu
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={isPending}>
              {saveMutation.isPending ? 'Čuvanje…' : 'Sačuvaj prijavu'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
