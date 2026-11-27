import { cn } from '@/lib/utils';

export type PortalTone = 'blue' | 'amber' | 'green' | 'red' | 'neutral';

const TONES: Record<PortalTone, { chip: string; dot: string }> = {
  blue: {
    chip: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    dot: 'bg-blue-700 dark:bg-blue-300',
  },
  amber: {
    chip: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    dot: 'bg-amber-700 dark:bg-amber-300',
  },
  green: {
    chip: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300',
    dot: 'bg-green-700 dark:bg-green-300',
  },
  red: {
    chip: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
    dot: 'bg-red-700 dark:bg-red-300',
  },
  neutral: {
    chip: 'bg-muted text-foreground/80',
    dot: 'bg-foreground/60',
  },
};

/** Rounded status label, optionally with a leading dot. */
export function PortalChip({
  tone,
  dot,
  className,
  children,
}: {
  tone: PortalTone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
        TONES[tone].chip,
        className,
      )}
    >
      {dot ? <span className={cn('size-1.5 rounded-full', TONES[tone].dot)} aria-hidden /> : null}
      {children}
    </span>
  );
}

export function PortalSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-muted-foreground px-1 text-xs font-semibold tracking-[0.06em] uppercase">
      {children}
    </h2>
  );
}

export function PortalCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn('bg-card rounded-2xl border', className)}>{children}</div>;
}

/** One line in a list card: title and subtitle on the left, status on the right. */
export function PortalRow({
  title,
  subtitle,
  aside,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3 border-b px-4 py-3.5 last:border-b-0', className)}>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold">{title}</div>
        {subtitle ? (
          <div className="text-muted-foreground mt-0.5 text-[13px]">{subtitle}</div>
        ) : null}
      </div>
      {aside}
    </div>
  );
}

/** Small grey tile with a caption and a value. */
export function PortalStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-muted/70 rounded-[10px] p-2.5">
      <div className="text-muted-foreground text-[11px]">{label}</div>
      <div className="mt-0.5 text-[15px] font-bold">{value}</div>
    </div>
  );
}

/** Label for a field in the portal's large touch forms. */
export function PortalFieldLabel({
  htmlFor,
  optional,
  children,
}: {
  htmlFor?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold">
      {children}
      {optional ? <span className="text-muted-foreground font-normal"> (opciono)</span> : null}
    </label>
  );
}

/** Class for the portal's tall inputs and selects (thumb friendly, 16px so iOS does not zoom). */
export const portalInputClass =
  'h-[50px] rounded-xl border-[1.5px] bg-card px-3.5 text-base font-medium md:text-base';

/** A choice button that looks pressed when selected (payment method, expense type, currency). */
export function PortalChoice({
  selected,
  disabled,
  onClick,
  className,
  children,
  role,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
  role?: 'radio';
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={role === 'radio' ? selected : undefined}
      aria-pressed={role === 'radio' ? undefined : selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-xl border text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55',
        selected
          ? 'border-foreground bg-foreground text-background'
          : 'bg-card text-foreground hover:bg-accent',
        className,
      )}
    >
      {children}
    </button>
  );
}
