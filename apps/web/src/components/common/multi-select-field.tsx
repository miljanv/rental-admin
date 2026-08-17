'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
  value: string;
  label: React.ReactNode;
}

interface MultiSelectFieldProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  emptyLabel?: string;
  className?: string;
  maxSelected?: number;
}

/** A bordered checkbox list for picking several ids at once (e.g. several vehicles/drivers on one trip). */
export function MultiSelectField({
  options,
  selected,
  onChange,
  disabled,
  emptyLabel = 'Nema dostupnih opcija.',
  className,
  maxSelected,
}: MultiSelectFieldProps) {
  const selectedSet = new Set(selected);
  const atLimit = maxSelected != null && selected.length >= maxSelected;

  const toggle = (value: string) => {
    const next = new Set(selectedSet);
    if (next.has(value)) {
      next.delete(value);
    } else {
      if (atLimit) {
        return;
      }
      next.add(value);
    }
    onChange(options.filter((option) => next.has(option.value)).map((option) => option.value));
  };

  if (options.length === 0) {
    return <p className="text-muted-foreground rounded-lg border px-3 py-4 text-sm">{emptyLabel}</p>;
  }

  return (
    <div
      className={cn(
        'grid max-h-56 grid-cols-1 gap-x-4 gap-y-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2',
        className,
      )}
    >
      {options.map((option) => (
        <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={selectedSet.has(option.value)}
            onCheckedChange={() => toggle(option.value)}
            disabled={disabled || (!selectedSet.has(option.value) && atLimit)}
          />
          <span className="truncate">{option.label}</span>
        </label>
      ))}
    </div>
  );
}
