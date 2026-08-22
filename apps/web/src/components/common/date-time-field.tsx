'use client';

import { useState } from 'react';

import { DateField } from '@/components/common/date-field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const splitDateTimeLocal = (value: string): { date: string; time: string } => {
  const [date = '', time = ''] = value.split('T');

  return { date, time: time.slice(0, 5) };
};

export const joinDateTimeLocal = (date: string, time: string): string => {
  if (!date) {
    return '';
  }

  return `${date}T${time || '00:00'}`;
};

export const dateFromDateTimeLocal = (value: string): string => value.slice(0, 10);

/** Digits only, formatted as `hh:mm` (24-hour). */
export const maskTimeInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

/** Complete `hh:mm` in 00–23 / 00–59, otherwise null. */
export const parseMaskedTime = (masked: string): string | null => {
  const match = /^(\d{2}):(\d{2})$/.exec(masked);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return `${match[1]}:${match[2]}`;
};

export interface DateTimeFieldProps {
  id?: string;
  /** `yyyy-mm-ddThh:mm`, or `''` when empty. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  'aria-invalid'?: boolean;
  className?: string;
}

/**
 * Date (`dd.mm.gggg.`) plus a 24-hour clock. Replaces
 * `<input type="datetime-local">` so the OS locale cannot force AM/PM.
 */
export function DateTimeField({
  id,
  value,
  onChange,
  disabled,
  className,
  ...rest
}: DateTimeFieldProps) {
  const { date, time } = splitDateTimeLocal(value);
  const [timeText, setTimeText] = useState(() => time);
  const [previousTime, setPreviousTime] = useState(time);

  if (time !== previousTime) {
    setPreviousTime(time);
    setTimeText(time);
  }

  const handleDateChange = (nextDate: string) => {
    onChange(joinDateTimeLocal(nextDate, parseMaskedTime(timeText) ?? time ?? '00:00'));
  };

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskTimeInput(event.target.value);
    setTimeText(masked);

    const parsed = parseMaskedTime(masked);
    if (parsed && date) {
      onChange(joinDateTimeLocal(date, parsed));
    }
  };

  const handleTimeBlur = () => {
    const parsed = parseMaskedTime(timeText);

    if (parsed) {
      if (date) {
        onChange(joinDateTimeLocal(date, parsed));
      }
      return;
    }

    setTimeText(time);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DateField
        id={id}
        value={date}
        onChange={handleDateChange}
        disabled={disabled}
        className="min-w-0 flex-1"
        {...rest}
      />
      <Input
        id={id ? `${id}-time` : undefined}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={timeText}
        onChange={handleTimeChange}
        onBlur={handleTimeBlur}
        disabled={disabled}
        placeholder="hh:mm"
        aria-label="Vreme (00–24)"
        className="w-[4.5rem] shrink-0 tabular-nums"
      />
    </div>
  );
}
