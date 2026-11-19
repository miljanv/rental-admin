'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { revealDriverAccessLink } from '@/features/drivers/api/drivers-api';
import { getApiErrorMessage } from '@/lib/api-error';

export const useRevealDriverAccessLink = (driverId: string) =>
  useMutation({
    mutationFn: () => revealDriverAccessLink(driverId),
    onError: (error) => {
      toast.error('Link nije prikazan.', { description: getApiErrorMessage(error) });
    },
  });
