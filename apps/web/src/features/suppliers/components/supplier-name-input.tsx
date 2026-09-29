'use client';

import { Input } from '@/components/ui/input';
import { useSupplierOptions } from '@/features/suppliers/hooks/use-supplier-options';

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
  const options = useSupplierOptions();

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
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  );
}
