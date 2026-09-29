'use client';

import { useMemo } from 'react';

import { Input } from '@/components/ui/input';
import { useCompanyExpenseSuppliers } from '@/features/company-expenses/hooks/use-company-expense-suppliers';
import { useFuelSuppliers } from '@/features/fuel-logs/hooks/use-fuel-suppliers';

interface SupplierNameInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  ariaInvalid?: boolean;
  placeholder?: string;
  listId?: string;
}

export function SupplierNameInput({
  id,
  value,
  onChange,
  onBlur,
  disabled,
  ariaInvalid,
  placeholder,
  listId = `${id}-supplier-options`,
}: SupplierNameInputProps) {
  const companySuppliersQuery = useCompanyExpenseSuppliers();
  const fuelSuppliersQuery = useFuelSuppliers();
  const options = useMemo(
    () =>
      [...new Set([...(companySuppliersQuery.data ?? []), ...(fuelSuppliersQuery.data ?? [])])]
        .filter((supplier) => supplier.trim().length > 0)
        .sort((left, right) => left.localeCompare(right, 'sr')),
    [companySuppliersQuery.data, fuelSuppliersQuery.data],
  );

  return (
    <>
      <Input
        id={id}
        list={listId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        placeholder={placeholder}
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  );
}
