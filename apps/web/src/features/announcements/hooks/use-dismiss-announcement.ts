'use client';

import type { ActiveAnnouncementDto } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { dismissAnnouncement } from '@/features/announcements/api/announcements-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

/** Hides the banner at once and brings it back if the server refuses. */
export const useDismissAnnouncement = () => {
  const queryClient = useQueryClient();
  const key = queryKeys.announcements.active();

  return useMutation({
    mutationFn: dismissAnnouncement,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ActiveAnnouncementDto[]>(key);
      queryClient.setQueryData<ActiveAnnouncementDto[]>(key, (current) =>
        current?.filter((announcement) => announcement.id !== id),
      );

      return { previous };
    },
    onError: (error, _id, context) => {
      queryClient.setQueryData(key, context?.previous);
      toast.error('Obaveštenje nije zatvoreno.', { description: getApiErrorMessage(error) });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
    },
  });
};
