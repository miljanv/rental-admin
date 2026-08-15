import { cn } from '@/lib/utils';

interface CharacterCounterProps {
  current: number;
  max: number;
  className?: string;
}

/** Small inline "current/max" hint for fixed-length fields (PIB, matični broj, JMBG…). */
export function CharacterCounter({ current, max, className }: CharacterCounterProps) {
  return (
    <span
      className={cn(
        'text-xs tabular-nums',
        current === max ? 'text-muted-foreground' : 'text-muted-foreground/70',
        className,
      )}
    >
      {current}/{max}
    </span>
  );
}
