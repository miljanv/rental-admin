'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  DRIVER_DOCUMENT_TYPE_LABELS,
  DRIVER_DOCUMENT_TYPES,
  EMPLOYMENT_CONTRACT_TYPE_LABELS,
  EMPLOYMENT_CONTRACT_TYPES,
  FILE_INPUT_ACCEPT,
  isAllowedMimeType,
  type DriverDocumentDto,
  type DriverDocumentWriteRequest,
} from '@rental-admin/shared';
import { FileIcon, X } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateDriverDocument } from '@/features/driver-documents/hooks/use-create-driver-document';
import { useUpdateDriverDocument } from '@/features/driver-documents/hooks/use-update-driver-document';
import { useUploadDocumentScan } from '@/features/driver-documents/hooks/use-upload-document-scan';
import { toDocumentFormValues } from '@/features/driver-documents/lib/document';
import {
  driverDocumentFormSchema,
  EMPTY_DOCUMENT_FORM,
  type DriverDocumentFormValues,
} from '@/features/driver-documents/schemas/driver-document-form-schema';
import { clientEnv } from '@/lib/env';
import { formatFileSize } from '@/lib/format';

interface DriverDocumentFormProps {
  driverId: string;
  document?: DriverDocumentDto;
  onDone: () => void;
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ id, label, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}

export function DriverDocumentForm({ driverId, document, onDone }: DriverDocumentFormProps) {
  const isEdit = Boolean(document);
  const createMutation = useCreateDriverDocument(driverId);
  const updateMutation = useUpdateDriverDocument(driverId);
  const scanUpload = useUploadDocumentScan();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const form = useForm<DriverDocumentFormValues, unknown, DriverDocumentWriteRequest>({
    resolver: zodResolver(driverDocumentFormSchema),
    defaultValues: document ? toDocumentFormValues(document) : EMPTY_DOCUMENT_FORM,
  });

  const documentType = useWatch({ control: form.control, name: 'type' });
  const contractType = useWatch({ control: form.control, name: 'employmentContractType' });
  const isEmploymentContract = documentType === 'EMPLOYMENT_CONTRACT';
  const isIndefinite = isEmploymentContract && contractType === 'INDEFINITE';
  const isPending = createMutation.isPending || updateMutation.isPending || scanUpload.isUploading;
  const errors = form.formState.errors;

  const selectScan = (file: File | undefined) => {
    if (!file) {
      return;
    }

    if (file.size <= 0) {
      setFileError('Izabrani fajl je prazan.');
      return;
    }

    if (file.size > clientEnv.maxFileSizeBytes) {
      setFileError(`Fajl je veći od limita od ${clientEnv.maxFileSizeMb} MB.`);
      return;
    }

    if (!isAllowedMimeType(file.type)) {
      setFileError('Ovaj tip fajla nije podržan.');
      return;
    }

    setFileError(null);
    setSelectedFile(file);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      let fileId = document?.file?.id ?? values.fileId ?? null;

      if (selectedFile) {
        const uploaded = await scanUpload.upload(selectedFile);
        fileId = uploaded.id;
      }

      const payload: DriverDocumentWriteRequest = {
        ...values,
        expiresAt: isIndefinite ? null : values.expiresAt,
        employmentContractType: isEmploymentContract ? values.employmentContractType : null,
        fileId,
      };

      if (document) {
        await updateMutation.mutateAsync({ documentId: document.id, body: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      onDone();
    } catch {
      // Upload and save errors are already toasted.
    }
  });

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>{isEdit ? 'Izmena dokumenta' : 'Novi dokument'}</CardTitle>
        <CardDescription>
          Unesite podatke o dokumentu i po želji priložite sken (PDF ili slika).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Field id="document-type" label="Tip dokumenta" error={errors.type?.message}>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value !== 'EMPLOYMENT_CONTRACT') {
                        form.setValue('employmentContractType', null);
                      }
                    }}
                    disabled={isPending}
                  >
                    <SelectTrigger id="document-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DRIVER_DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {DRIVER_DOCUMENT_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            {isEmploymentContract ? (
              <Controller
                control={form.control}
                name="employmentContractType"
                render={({ field }) => (
                  <Field
                    id="contract-type"
                    label="Tip ugovora"
                    error={errors.employmentContractType?.message}
                  >
                    <Select
                      value={field.value || undefined}
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value === 'INDEFINITE') {
                          form.setValue('expiresAt', null);
                        }
                      }}
                      disabled={isPending}
                    >
                      <SelectTrigger id="contract-type" className="w-full">
                        <SelectValue placeholder="Izaberite tip ugovora" />
                      </SelectTrigger>
                      <SelectContent>
                        {EMPLOYMENT_CONTRACT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {EMPLOYMENT_CONTRACT_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            ) : null}

            <Field
              id="documentNumber"
              label="Broj dokumenta"
              error={errors.documentNumber?.message}
            >
              <Input
                id="documentNumber"
                disabled={isPending}
                aria-invalid={Boolean(errors.documentNumber)}
                {...form.register('documentNumber')}
              />
            </Field>

            <Field id="issuedAt" label="Datum izdavanja" error={errors.issuedAt?.message}>
              <Input
                id="issuedAt"
                type="date"
                disabled={isPending}
                aria-invalid={Boolean(errors.issuedAt)}
                {...form.register('issuedAt')}
              />
            </Field>

            {isIndefinite ? null : (
              <Field id="expiresAt" label="Datum isteka" error={errors.expiresAt?.message}>
                <Input
                  id="expiresAt"
                  type="date"
                  disabled={isPending}
                  aria-invalid={Boolean(errors.expiresAt)}
                  {...form.register('expiresAt', {
                    setValueAs: (value: string) => (value ? value : null),
                  })}
                />
              </Field>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="document-scan">Sken dokumenta</Label>
            {document?.file && !selectedFile ? (
              <p className="text-muted-foreground text-sm">
                Trenutni sken: {document.file.originalName}
              </p>
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
                  onClick={() => setSelectedFile(null)}
                  disabled={isPending}
                  aria-label="Ukloni izabrani sken"
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </div>
            ) : (
              <Input
                id="document-scan"
                type="file"
                accept={FILE_INPUT_ACCEPT}
                disabled={isPending}
                onChange={(event) => {
                  selectScan(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            )}
            {fileError ? <p className="text-destructive text-xs">{fileError}</p> : null}
            {scanUpload.isUploading ? <Progress value={scanUpload.progress} /> : null}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
              Otkaži
            </Button>
            <Button type="submit" disabled={isPending}>
              {scanUpload.isUploading
                ? `Otpremanje skena… ${scanUpload.progress}%`
                : isPending
                  ? 'Čuvanje…'
                  : isEdit
                    ? 'Sačuvaj izmene'
                    : 'Dodaj dokument'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
