'use client';

import { Camera, FileCheck2, RotateCcw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useUploadReceipt } from '@/features/driver-portal/hooks/use-upload-receipt';
import { getApiErrorMessage, isCanceledError } from '@/lib/api-error';

interface ReceiptFieldProps {
  token: string;
  id: string;
  fileName: string | null;
  disabled?: boolean;
  onUploaded: (file: { id: string; originalName: string }) => void;
  onRemove: () => void;
  onBusyChange: (busy: boolean) => void;
}

/** Take a photo of the receipt (or pick a file) and upload it right away. */
export function ReceiptField({
  token,
  id,
  fileName,
  disabled,
  onUploaded,
  onRemove,
  onBusyChange,
}: ReceiptFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState(0);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const mutation = useUploadReceipt(token);
  const { isPending } = mutation;

  useEffect(() => {
    onBusyChange(isPending);
  }, [isPending, onBusyChange]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const upload = (file: File) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLastFile(file);
    setProgress(0);
    mutation.mutate(
      { file, onProgress: setProgress, signal: controller.signal },
      { onSuccess: (uploaded) => onUploaded(uploaded) },
    );
  };

  const error = mutation.isError && !isCanceledError(mutation.error) ? mutation.error : null;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';

          if (file) {
            upload(file);
          }
        }}
      />

      {isPending ? (
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">Slanje slike… {progress}%</p>
          <Progress value={progress} />
        </div>
      ) : fileName ? (
        <div className="flex items-center gap-2 text-sm">
          <FileCheck2 className="size-4 shrink-0 text-emerald-600" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{fileName}</span>
          {disabled ? null : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Ukloni račun"
              onClick={onRemove}
            >
              <X className="size-4" aria-hidden />
            </Button>
          )}
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="size-4" aria-hidden />
          Slikaj račun
        </Button>
      )}

      {error ? (
        <div className="flex items-center gap-2">
          <p className="text-destructive min-w-0 flex-1 text-xs">{getApiErrorMessage(error)}</p>
          {lastFile ? (
            <Button type="button" size="sm" variant="outline" onClick={() => upload(lastFile)}>
              <RotateCcw className="size-4" aria-hidden />
              Ponovi
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
