'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FILE_INPUT_ACCEPT } from '@rental-admin/shared';
import { CloudUpload, FileIcon, Upload, X } from 'lucide-react';
import { useCallback, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useUploadFile } from '@/features/files/hooks/use-upload-file';
import {
  MAX_FILE_SIZE_LABEL,
  uploadFormSchema,
  type UploadFormValues,
} from '@/features/files/schemas/upload-schema';
import { formatFileSize, formatMimeType } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface FileUploadCardHandle {
  /** Opens the native file picker; used by the page header button. */
  openFilePicker: () => void;
}

interface FileUploadCardProps {
  ref?: Ref<FileUploadCardHandle>;
}

export function FileUploadCard({ ref }: FileUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { upload, cancel, isUploading, progress, stageLabel } = useUploadFile();

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    mode: 'onChange',
  });

  const selectedFile: File | undefined = useWatch({ control: form.control, name: 'file' });
  const fileError = form.formState.errors.file?.message;

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  useImperativeHandle(ref, () => ({ openFilePicker }), [openFilePicker]);

  const selectFile = useCallback(
    (file: File | undefined) => {
      if (!file) {
        return;
      }

      form.setValue('file', file, { shouldValidate: true, shouldDirty: true });
    },
    [form],
  );

  const clearSelection = useCallback(() => {
    form.reset({ file: undefined });
  }, [form]);

  const onSubmit = form.handleSubmit(async (values) => {
    // The mutation's pending state also disables the button, so a double submit
    // cannot reach this point.
    if (isUploading) {
      return;
    }

    try {
      await upload(values.file);
      clearSelection();
    } catch {
      // Errors are surfaced as toasts by the mutation; the selection is kept so
      // the user can retry without picking the file again.
    }
  });

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (isUploading) {
      return;
    }

    selectFile(event.dataTransfer.files[0]);
  };

  return (
    <Card className="shadow-none">
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              'rounded-lg border border-dashed px-6 py-10 text-center transition-colors',
              isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/30',
              isUploading && 'pointer-events-none opacity-60',
            )}
          >
            <span className="bg-background text-muted-foreground mx-auto mb-4 flex size-11 items-center justify-center rounded-full border">
              <CloudUpload className="size-5" aria-hidden />
            </span>
            <p className="text-sm font-medium">Drag and drop a file here</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Images, PDF, TXT, CSV, Word, Excel and ZIP up to {MAX_FILE_SIZE_LABEL}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={openFilePicker}
              disabled={isUploading}
            >
              Choose file
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={FILE_INPUT_ACCEPT}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];

                // Clearing the input keeps re-picking the same file working,
                // since the change event only fires when the value differs.
                event.target.value = '';
                selectFile(file);
              }}
              disabled={isUploading}
            />
          </div>

          {selectedFile ? (
            <div className="rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
                  <FileIcon className="size-4.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {formatFileSize(selectedFile.size)} ·{' '}
                    {selectedFile.type ? formatMimeType(selectedFile.type) : 'Unknown type'}
                  </p>
                  <p className="text-muted-foreground/80 mt-0.5 font-mono text-[11px]">
                    {selectedFile.type || 'unknown/unknown'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={isUploading ? cancel : clearSelection}
                  aria-label={isUploading ? 'Cancel upload' : 'Remove selected file'}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </div>

              {isUploading ? (
                <div className="mt-4 space-y-2">
                  <Progress value={progress} aria-label="Upload progress" />
                  <div className="text-muted-foreground flex items-center justify-between text-xs">
                    <span>{stageLabel}</span>
                    <span className="tabular-nums">{progress}%</span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {fileError ? (
            <p role="alert" className="text-destructive text-sm">
              {fileError}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2">
            {selectedFile && !isUploading ? (
              <Button type="button" variant="ghost" onClick={clearSelection}>
                Remove
              </Button>
            ) : null}
            {isUploading ? (
              <Button type="button" variant="outline" onClick={cancel}>
                Cancel upload
              </Button>
            ) : null}
            <Button type="submit" disabled={!selectedFile || isUploading || Boolean(fileError)}>
              <Upload className="size-4" aria-hidden />
              {isUploading ? 'Uploading…' : 'Upload file'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
