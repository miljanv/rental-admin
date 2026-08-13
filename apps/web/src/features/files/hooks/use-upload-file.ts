'use client';

import { isAllowedMimeType } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import { confirmUpload, requestUploadUrl, uploadToStorage } from '@/features/files/api/files-api';
import { getApiErrorMessage, parseApiError } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export type UploadStage = 'idle' | 'preparing' | 'uploading' | 'finalizing';

const STAGE_LABELS: Record<UploadStage, string> = {
  idle: '',
  preparing: 'Preparing upload…',
  uploading: 'Uploading to storage…',
  finalizing: 'Finishing up…',
};

/**
 * Drives the full upload: presign, direct PUT to S3 with progress, then confirm.
 * The mutation is the only writer of `stage` and `progress`, so a second submit
 * cannot start while one is in flight.
 */
export const useUploadFile = () => {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<UploadStage>('idle');
  const abortControllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      // Re-checked here so the request body is provably a supported MIME type,
      // independent of whichever component started the upload.
      if (!isAllowedMimeType(file.type)) {
        throw new Error('This file type is not supported.');
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setStage('preparing');
      setProgress(0);

      const presigned = await requestUploadUrl({
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
      });

      setStage('uploading');

      await uploadToStorage({
        uploadUrl: presigned.uploadUrl,
        file,
        signal: controller.signal,
        onProgress: setProgress,
      });

      setStage('finalizing');

      return confirmUpload(presigned.fileId);
    },
    onSuccess: async (uploadedFile) => {
      toast.success('File uploaded', { description: uploadedFile.originalName });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.files.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ]);
    },
    onError: (error) => {
      if (parseApiError(error).isCanceled) {
        toast.info('Upload canceled');
        return;
      }

      toast.error('Upload failed', { description: getApiErrorMessage(error) });
    },
    onSettled: () => {
      abortControllerRef.current = null;
      setStage('idle');
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
    stage,
    stageLabel: STAGE_LABELS[stage],
  };
};
