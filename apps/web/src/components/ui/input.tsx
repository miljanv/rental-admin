import * as React from 'react';

import { cn } from '@/lib/utils';

// Native date/time inputs only open their picker when the tiny calendar icon
// itself is clicked — everywhere else on the field just places a text caret.
// Opening it on any click (via the browser's own showPicker API) makes the
// whole field behave like a real date picker instead of a text box with a
// hidden hotspot.
const PICKER_TYPES = new Set(['date', 'time', 'datetime-local', 'month', 'week']);

function Input({ className, type, onClick, ...props }: React.ComponentProps<'input'>) {
  const handleClick = (event: React.MouseEvent<HTMLInputElement>) => {
    onClick?.(event);

    if (type && PICKER_TYPES.has(type) && !event.currentTarget.disabled) {
      try {
        event.currentTarget.showPicker?.();
      } catch {
        // Unsupported browser, or the picker is already open — fall back to
        // the default click behavior, nothing more to do.
      }
    }
  };

  return (
    <input
      type={type}
      data-slot="input"
      onClick={handleClick}
      className={cn(
        'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
