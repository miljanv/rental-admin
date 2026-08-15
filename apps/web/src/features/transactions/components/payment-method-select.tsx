'use client';

import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type PaymentMethod,
} from '@rental-admin/shared';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const NONE = 'none';

interface PaymentMethodSelectProps {
  id: string;
  value: PaymentMethod | '' | null | undefined;
  onChange: (value: PaymentMethod | '') => void;
  disabled?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

export function PaymentMethodSelect({
  id,
  value,
  onChange,
  disabled,
  allowEmpty = false,
  emptyLabel = 'Nije uneto',
}: PaymentMethodSelectProps) {
  const selectValue = value || (allowEmpty ? NONE : '');

  return (
    <Select
      value={selectValue}
      onValueChange={(next) => onChange(next === NONE ? '' : (next as PaymentMethod))}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Izaberite" />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty ? <SelectItem value={NONE}>{emptyLabel}</SelectItem> : null}
        {PAYMENT_METHODS.map((method) => (
          <SelectItem key={method} value={method}>
            {PAYMENT_METHOD_LABELS[method]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
