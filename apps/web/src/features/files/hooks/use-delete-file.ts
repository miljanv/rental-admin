'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteFile } from '@/features/files/api/files-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeleteFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: string; originalName: string }) => deleteFile(variables.id),
    onSuccess: async (_result, variables) => {
      toast.success('File deleted', { description: variables.originalName });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.files.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ]);
    },
    onError: (error) => {
      toast.error('Could not delete the file', { description: getApiErrorMessage(error) });
    },
  });
};
