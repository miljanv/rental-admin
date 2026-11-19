'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  TRIP_EXPENSE_CATEGORIES,
  TRIP_EXPENSE_CATEGORY_LABELS,
  TRIP_EXPENSE_PAYMENT_METHODS,
  TRIP_EXPENSE_PAYMENT_METHOD_LABELS,
  type TripExpenseDto,
  type TripExpenseWriteRequest,
} from '@rental-admin/shared';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePaymentCards } from '@/features/payment-cards/hooks/use-payment-cards';
import { useCreateTripExpense } from '@/features/trips/hooks/use-create-trip-expense';
import { useUpdateTripExpense } from '@/features/trips/hooks/use-update-trip-expense';
import {
  EMPTY_TRIP_EXPENSE_FORM,
  tripExpenseFormSchema,
  type TripExpenseFormValues,
} from '@/features/trips/schemas/trip-expense-form-schema';
import { ScanUploadField } from '@/features/vehicles/components/scan-upload-field';
import { useScanSelection } from '@/features/vehicles/hooks/use-scan-selection';
import { useUploadVehicleScan } from '@/features/vehicles/hooks/use-upload-vehicle-scan';

interface TripExpenseFormProps {
  tripId: string;
  expense?: TripExpenseDto;
  onDone: () => void;
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

export function TripExpenseForm({ tripId, expense, onDone }: TripExpenseFormProps) {
  const isEdit = Boolean(expense);
  const createMutation = useCreateTripExpense(tripId);
  const updateMutation = useUpdateTripExpense(tripId);
  const scanUpload = useUploadVehicleScan();
  const { selectedFile, fileError, selectFile, clearFile } = useScanSelection();
  const isPending = createMutation.isPending || updateMutation.isPending || scanUpload.isUploading;

  const form = useForm<TripExpenseFormValues, unknown, TripExpenseWriteRequest>({
    resolver: zodResolver(tripExpenseFormSchema),
    defaultValues: expense
      ? {
          category: expense.category,
          amount: expense.amount,
          paymentMethod: expense.paymentMethod,
          paymentCardId: expense.paymentCard?.id ?? '',
          note: expense.note ?? '',
          fileId: expense.file?.id ?? '',
        }
      : EMPTY_TRIP_EXPENSE_FORM,
  });

  const errors = form.formState.errors;
  const paymentMethod = useWatch({ control: form.control, name: 'paymentMethod' });
  const cardsQuery = usePaymentCards();
  // Active cards, plus the one this expense already has even if it was switched off since.
  const cards = (cardsQuery.data ?? []).filter(
    (card) => card.isActive || card.id === expense?.paymentCard?.id,
  );

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      let fileId = expense?.file?.id ?? values.fileId ?? null;

      if (selectedFile) {
        const uploaded = await scanUpload.upload(selectedFile);
        fileId = uploaded.id;
      }

      const payload: TripExpenseWriteRequest = { ...values, fileId };

      if (expense) {
        await updateMutation.mutateAsync({ expenseId: expense.id, body: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      onDone();
    } catch {
      // Upload and save errors are already toasted.
    }
  });

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>{isEdit ? 'Izmena troška' : 'Novi trošak'}</CardTitle>
        <CardDescription>
          Stavka se automatski prebacuje u Finansije kao rashod, da se ne unosi dvaput.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <Field id="category" label="Kategorija" error={errors.category?.message}>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIP_EXPENSE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {TRIP_EXPENSE_CATEGORY_LABELS[category]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Field id="amount" label="Iznos (RSD)" error={errors.amount?.message as string | undefined}>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                disabled={isPending}
                {...form.register('amount', { valueAsNumber: true })}
              />
            </Field>
            <Controller
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <Field id="paymentMethod" label="Način plaćanja" error={errors.paymentMethod?.message}>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <SelectTrigger id="paymentMethod" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIP_EXPENSE_PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {TRIP_EXPENSE_PAYMENT_METHOD_LABELS[method]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            {paymentMethod === 'COMPANY_CARD' && cards.length > 0 ? (
              <Controller
                control={form.control}
                name="paymentCardId"
                render={({ field }) => (
                  <Field id="paymentCardId" label="Kartica" error={errors.paymentCardId?.message}>
                    <Select
                      value={field.value || 'none'}
                      onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                      disabled={isPending}
                    >
                      <SelectTrigger id="paymentCardId" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nije navedeno</SelectItem>
                        {cards.map((card) => (
                          <SelectItem key={card.id} value={card.id}>
                            {card.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            ) : null}
            <div className="sm:col-span-2">
              <Field id="note" label="Napomena" error={errors.note?.message}>
                <Textarea id="note" rows={2} disabled={isPending} {...form.register('note')} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <ScanUploadField
                id="receipt"
                label="Račun / fiskalni isečak (opciono)"
                currentFileName={expense?.file?.originalName}
                selectedFile={selectedFile}
                onSelectFile={selectFile}
                onRemoveFile={clearFile}
                error={fileError}
                disabled={isPending}
                isUploading={scanUpload.isUploading}
                uploadProgress={scanUpload.progress}
              />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
              Otkaži
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Čuvanje…' : isEdit ? 'Sačuvaj izmenu' : 'Dodaj trošak'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
