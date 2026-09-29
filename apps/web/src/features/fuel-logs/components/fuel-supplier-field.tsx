'use client';

import { Label } from '@/components/ui/label';
import { SupplierNameInput } from '@/features/suppliers/components/supplier-name-input';

interface FuelSupplierFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  listId?: string;
}

export function FuelSupplierField({
  id,
  value,
  onChange,
  disabled,
  error,
  listId = 'fuel-supplier-options',
}: FuelSupplierFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Dobavljač</Label>
      <SupplierNameInput
        id={id}
        listId={listId}
        value={value}
        onChange={onChange}
        placeholder="OMV, NIS, EuroWag…"
        disabled={disabled}
        ariaInvalid={Boolean(error)}
      />
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
