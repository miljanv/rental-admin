'use client';

import { FILE_INPUT_ACCEPT } from '@rental-admin/shared';
import { FileIcon, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { formatFileSize } from '@/lib/format';

interface ScanUploadFieldProps {
  id: string;
  label?: string;
  /** Name of the scan already attached to the record, if any (and no new file is staged). */
  currentFileName?: string | null;
  selectedFile: File | null;
  onSelectFile: (file: File | undefined) => void;
  onRemoveFile: () => void;
  error?: string | null;
  disabled?: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
}

/**
 * The "attach a scan" block shared by every vehicle sub-record form
 * (inspections, calibrations, safety equipment, vehicle documents). Purely
 * controlled — the parent form owns MIME/size validation and the actual
 * upload mutation.
 */
export function ScanUploadField({
  id,
  label = 'Sken dokumenta',
  currentFileName,
  selectedFile,
  onSelectFile,
  onRemoveFile,
  error,
  disabled,
  isUploading,
  uploadProgress = 0,
}: ScanUploadFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {currentFileName && !selectedFile ? (
        <p className="text-muted-foreground text-sm">Trenutni sken: {currentFileName}</p>
      ) : null}
      {selectedFile ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <FileIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
            <span className="truncate text-sm">{selectedFile.name}</span>
            <span className="text-muted-foreground shrink-0 text-xs">
              {formatFileSize(selectedFile.size)}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onRemoveFile}
            disabled={disabled}
            aria-label="Ukloni izabrani sken"
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      ) : (
        <Input
          id={id}
          type="file"
          accept={FILE_INPUT_ACCEPT}
          disabled={disabled}
          onChange={(event) => {
            onSelectFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      )}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      {isUploading ? <Progress value={uploadProgress} /> : null}
    </div>
  );
}
