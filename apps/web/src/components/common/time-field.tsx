'use client';

import { useState } from 'react';

import { maskTimeInput, parseMaskedTime } from '@/components/common/date-time-field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface TimeFieldProps {
  id?: string;
  /** `hh:mm` (24-hour), or `''` when empty. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  'aria-invalid'?: boolean;
  className?: string;
}

/**
 * 24-hour clock (`00:00`–`23:59`). Replaces `<input type="time">` so the OS
 * locale cannot force AM/PM.
 */
export function TimeField({ value, onChange, onBlur, className, ...rest }: TimeFieldProps) {
  const [text, setText] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);

  if (value !== previousValue) {
    setPreviousValue(value);
    setText(value);
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskTimeInput(event.target.value);
    setText(masked);

    if (masked === '') {
      onChange('');
      return;
    }

    const parsed = parseMaskedTime(masked);
    if (parsed) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    if (text !== '' && !parseMaskedTime(text)) {
      setText(value);
    }
    onBlur?.();
  };

  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="hh:mm"
      className={cn('tabular-nums', className)}
      {...rest}
    />
  );
}
