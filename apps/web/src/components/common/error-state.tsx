'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

/** Shown when a request failed, with a way to try again. */
export function ErrorState({
  error,
  title = 'Could not load the data',
  onRetry,
  isRetrying = false,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}
    >
      <span className="bg-destructive/10 text-destructive mb-4 flex size-11 items-center justify-center rounded-full">
        <AlertCircle className="size-5" aria-hidden />
      </span>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-muted-foreground mt-1 max-w-md text-sm">{getApiErrorMessage(error)}</p>
      {onRetry ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-5"
        >
          <RefreshCw className={cn('size-4', isRetrying && 'animate-spin')} aria-hidden />
          {isRetrying ? 'Retrying…' : 'Try again'}
        </Button>
      ) : null}
    </div>
  );
}
