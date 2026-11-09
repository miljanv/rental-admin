'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchAnnouncements } from '@/features/announcements/api/announcements-api';
import { queryKeys } from '@/lib/query-keys';

export const useAnnouncements = () =>
  useQuery({
    queryKey: queryKeys.announcements.list(),
    queryFn: ({ signal }) => fetchAnnouncements(signal),
  });
