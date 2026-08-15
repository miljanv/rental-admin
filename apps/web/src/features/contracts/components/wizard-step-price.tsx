'use client';

import { CONTRACT_STATUS_LABELS, CONTRACT_STATUSES, type ContractWriteRequest } from '@rental-admin/shared';
import { Controller, useFormContext, type UseFormReturn } from 'react-hook-form';

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
import type { ContractFormValues } from '@/features/contracts/schemas/contract-form-schema';

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

type ContractForm = UseFormReturn<ContractFormValues, unknown, ContractWriteRequest>;

export function WizardStepPrice() {
  const form = useFormContext<ContractFormValues>() as ContractForm;
  const errors = form.formState.errors;

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Cena i uslovi plaćanja</CardTitle>
        <CardDescription>Ukupna cena, avans i status ugovora.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Field id="price" label="Cena (RSD)" error={errors.price?.message}>
          <Input
            id="price"
            type="number"
            inputMode="decimal"
            step="0.01"
            aria-invalid={Boolean(errors.price)}
            {...form.register('price', { valueAsNumber: true })}
          />
        </Field>
        <Field id="advancePercentage" label="Avans (%)" error={errors.advancePercentage?.message}>
          <Input
            id="advancePercentage"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            aria-invalid={Boolean(errors.advancePercentage)}
            {...form.register('advancePercentage', { valueAsNumber: true })}
          />
        </Field>
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <Field id="status" label="Status" error={errors.status?.message}>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {CONTRACT_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        />
        <div className="sm:col-span-2">
          <Field id="notes" label="Napomene" error={errors.notes?.message}>
            <Textarea id="notes" rows={3} {...form.register('notes')} />
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}
