'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { revokeUserSessions } from '@/features/admin/api/users-api';
import { getApiErrorMessage } from '@/lib/api-error';

export const useRevokeUserSessions = () =>
  useMutation({
    mutationFn: (id: string) => revokeUserSessions(id),
    onSuccess: (user) => {
      toast.success('Korisnik je odjavljen sa svih uređaja.', { description: user.username });
    },
    onError: (error) => {
      toast.error('Odjava nije uspela.', { description: getApiErrorMessage(error) });
    },
  });
