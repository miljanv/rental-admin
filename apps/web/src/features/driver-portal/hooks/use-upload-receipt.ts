'use client';

import type { DriverPortalFileDto } from '@rental-admin/shared';
import { useMutation } from '@tanstack/react-query';

import { confirmReceipt, presignReceipt } from '@/features/driver-portal/api/driver-portal-api';
import { prepareReceipt } from '@/features/driver-portal/lib/prepare-receipt';
import { uploadToStorage } from '@/features/files/api/files-api';

interface UploadReceiptVariables {
  file: File;
  onProgress: (percent: number) => void;
  signal: AbortSignal;
}

/** Shrinks the photo, sends it straight to storage and confirms it with the API. */
export const useUploadReceipt = (token: string) =>
  useMutation({
    mutationFn: async ({
      file,
      onProgress,
      signal,
    }: UploadReceiptVariables): Promise<DriverPortalFileDto> => {
      const prepared = await prepareReceipt(file);
      const upload = await presignReceipt(
        token,
        {
          originalName: prepared.file.name,
          mimeType: prepared.mimeType,
          size: prepared.file.size,
        },
        signal,
      );

      await uploadToStorage({
        uploadUrl: upload.uploadUrl,
        file: prepared.file,
        onProgress,
        signal,
      });

      return confirmReceipt(token, upload.fileId);
    },
  });
