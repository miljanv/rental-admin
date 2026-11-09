'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteAnnouncement } from '@/features/announcements/api/announcements-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeleteAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: async () => {
      toast.success('Obaveštenje je obrisano.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
    },
    onError: (error) => {
      toast.error('Obaveštenje nije obrisano.', { description: getApiErrorMessage(error) });
    },
  });
};
