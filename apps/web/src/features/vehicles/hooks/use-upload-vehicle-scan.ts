'use client';

import { isAllowedMimeType } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import { confirmUpload, requestUploadUrl, uploadToStorage } from '@/features/files/api/files-api';
import { getApiErrorMessage, parseApiError } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

/**
 * Shared by every "attach a scan" form under the vehicle profile (technical
 * inspections, tachograph calibrations, safety equipment, vehicle
 * documents) — the upload mechanics have no domain-specific behavior.
 */
export const useUploadVehicleScan = () => {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      if (!isAllowedMimeType(file.type)) {
        throw new Error('Ovaj tip fajla nije podržan.');
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setProgress(0);

      const presigned = await requestUploadUrl({
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
      });

      await uploadToStorage({
        uploadUrl: presigned.uploadUrl,
        file,
        signal: controller.signal,
        onProgress: setProgress,
      });

      return confirmUpload(presigned.fileId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.files.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ]);
    },
    onError: (error) => {
      if (parseApiError(error).isCanceled) {
        return;
      }

      toast.error('Sken nije otpremljen.', { description: getApiErrorMessage(error) });
    },
    onSettled: () => {
      abortControllerRef.current = null;
      setProgress(0);
    },
  });

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    upload: mutation.mutateAsync,
    cancel,
    isUploading: mutation.isPending,
    progress,
  };
};
