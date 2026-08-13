'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { fetchDownloadUrl } from '@/features/files/api/files-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

/**
 * Fetches a short lived presigned GET URL and hands it to the browser. The
 * object is returned with `Content-Disposition: attachment`, so the download
 * starts without navigating away from the panel.
 */
export const useDownloadFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: string; originalName: string }) => fetchDownloadUrl(variables.id),
    onSuccess: (result) => {
      window.location.assign(result.downloadUrl);
    },
    onError: async (error) => {
      toast.error('Could not download the file', { description: getApiErrorMessage(error) });

      // The row may have been marked FAILED because the object disappeared.
      await queryClient.invalidateQueries({ queryKey: queryKeys.files.all });
    },
  });
};
