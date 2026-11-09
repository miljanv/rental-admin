import { changePasswordSchema } from '@rental-admin/shared';
import { z } from 'zod';

export const changePasswordFormSchema = changePasswordSchema
  .and(z.object({ confirmPassword: z.string() }))
  .refine((value) => value.confirmPassword === value.newPassword, {
    path: ['confirmPassword'],
    message: 'Lozinke se ne poklapaju.',
  });

export type ChangePasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};
