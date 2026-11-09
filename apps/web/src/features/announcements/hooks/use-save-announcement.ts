'use client';

import type { AnnouncementWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  createAnnouncement,
  updateAnnouncement,
} from '@/features/announcements/api/announcements-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

/** Creates a banner, or updates it when `id` is given. */
export const useSaveAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string | null; body: AnnouncementWriteRequest }) =>
      id ? updateAnnouncement(id, body) : createAnnouncement(body),
    onSuccess: async (_announcement, { id }) => {
      toast.success(id ? 'Obaveštenje je izmenjeno.' : 'Obaveštenje je objavljeno.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
    },
    onError: (error) => {
      toast.error('Obaveštenje nije sačuvano.', { description: getApiErrorMessage(error) });
    },
  });
};
