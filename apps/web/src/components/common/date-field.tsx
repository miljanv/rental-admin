'use client';

import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { formatMonthYear } from '@/lib/format';
import { cn } from '@/lib/utils';

const WEEKDAY_HEADER = ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'];
const CELL_COUNT = 42;

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const parseIsoDate = (iso: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;

  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
};

/** "01.01.1990." — matches the read-only `formatDate()` display convention. */
export const isoToMasked = (iso: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);

  if (!match) {
    return '';
  }

  const [, year, month, day] = match;

  return `${day}.${month}.${year}.`;
};

/** Strips everything but digits and re-inserts the dots as the user types. */
export const maskDateInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  let out = '';

  for (let index = 0; index < digits.length; index += 1) {
    out += digits[index];
    if (index === 1 || index === 3) {
      out += '.';
    }
  }

  if (digits.length === 8) {
    out += '.';
  }

  return out;
};

/** Returns the ISO date if `masked` is a complete, real calendar date — otherwise null. */
export const parseMaskedDate = (masked: string): string | null => {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})\.?$/.exec(masked);

  if (!match) {
    return null;
  }

  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  const date = new Date(Date.UTC(year, month - 1, day));

  const isRealDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;

  return isRealDate ? `${yyyy}-${mm}-${dd}` : null;
};

/** Six full weeks (Monday-first) covering the given UTC month, including lead/trail days. */
const buildMonthGrid = (year: number, month: number): Date[] => {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const leadDays = (firstOfMonth.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, month, 1 - leadDays));

  return Array.from({ length: CELL_COUNT }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return date;
  });
};

interface DateFieldCalendarProps {
  value: string;
  onSelect: (isoDate: string) => void;
}

function DateFieldCalendar({ value, onSelect }: DateFieldCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const selected = useMemo(() => parseIsoDate(value), [value]);
  const [year, setYear] = useState(() => (selected ?? today).getUTCFullYear());
  const [month, setMonth] = useState(() => (selected ?? today).getUTCMonth());

  const days = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const todayIso = toIsoDate(today);

  const goToPreviousMonth = () => {
    if (month === 0) {
      setYear((current) => current - 1);
      setMonth(11);
    } else {
      setMonth((current) => current - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 11) {
      setYear((current) => current + 1);
      setMonth(0);
    } else {
      setMonth((current) => current + 1);
    }
  };

  return (
    <div className="w-64 space-y-2">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={goToPreviousMonth}
          aria-label="Prethodni mesec"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <p className="text-sm font-medium capitalize">{formatMonthYear(year, month + 1)}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={goToNextMonth}
          aria-label="Sledeći mesec"
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>

      <div className="text-muted-foreground grid grid-cols-7 text-center text-xs">
        {WEEKDAY_HEADER.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((date) => {
          const iso = toIsoDate(date);
          const isCurrentMonth = date.getUTCMonth() === month;
          const isSelected = iso === value;
          const isToday = iso === todayIso;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className={cn(
                'hover:bg-muted flex size-8 items-center justify-center rounded-md text-sm transition-colors',
                !isCurrentMonth && 'text-muted-foreground/50',
                isToday && !isSelected && 'text-primary font-semibold',
                isSelected && 'bg-primary text-primary-foreground hover:bg-primary',
              )}
            >
              {date.getUTCDate()}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => onSelect(todayIso)}>
          Danas
        </Button>
        <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => onSelect('')}>
          Obriši
        </Button>
      </div>
    </div>
  );
}

export interface DateFieldProps {
  id?: string;
  /** ISO `yyyy-mm-dd`, or `''` when empty. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  'aria-invalid'?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Text input showing "dd.mm.gggg." (typeable, auto-masked) paired with a
 * click-to-open calendar popover — a drop-in replacement for
 * `<Input type="date">` that isn't at the mercy of the browser/OS locale.
 */
export function DateField({
  id,
  value,
  onChange,
  disabled,
  placeholder = 'dd.mm.gggg.',
  className,
  ...rest
}: DateFieldProps) {
  const [text, setText] = useState(() => isoToMasked(value));
  const [isOpen, setIsOpen] = useState(false);

  // Stay in sync when the value changes from outside (form reset, loading an
  // existing record, the calendar itself) — adjusted during render rather
  // than in an effect, per https://react.dev/learn/you-might-not-need-an-effect.
  const [previousValue, setPreviousValue] = useState(value);
  if (value !== previousValue) {
    setPreviousValue(value);
    setText(isoToMasked(value));
  }

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskDateInput(event.target.value);
    setText(masked);

    if (masked === '') {
      onChange('');
      return;
    }

    const iso = parseMaskedDate(masked);
    if (iso) {
      onChange(iso);
    }
  };

  const handleSelect = (isoDate: string) => {
    onChange(isoDate);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverAnchor asChild>
        <div className={cn('relative flex items-center', className)}>
          <Input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={text}
            onChange={handleTextChange}
            onFocus={() => setIsOpen(true)}
            disabled={disabled}
            placeholder={placeholder}
            className="pr-8"
            {...rest}
          />
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => setIsOpen((current) => !current)}
            aria-label="Otvori kalendar"
            className="text-muted-foreground hover:text-foreground absolute right-2 disabled:pointer-events-none disabled:opacity-50"
          >
            <CalendarIcon className="size-4" aria-hidden />
          </button>
        </div>
      </PopoverAnchor>
      <PopoverContent className="w-auto p-3" align="start">
        <DateFieldCalendar value={value} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  );
}
