'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useFuelSuppliers } from '@/features/fuel-logs/hooks/use-fuel-suppliers';

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
  const query = useFuelSuppliers();
  const suppliers = query.data ?? [];

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Dobavljač</Label>
      <Input
        id={id}
        list={listId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="OMV, NIS, EuroWag…"
        disabled={disabled}
        aria-invalid={Boolean(error)}
        autoComplete="off"
      />
      <datalist id={listId}>
        {suppliers.map((supplier) => (
          <option key={supplier} value={supplier} />
        ))}
      </datalist>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
