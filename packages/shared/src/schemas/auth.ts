import { z } from 'zod';

import { passwordSchema } from './user-admin';

export const loginRequestSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, 'Korisničko ime je obavezno.')
    .max(64, 'Korisničko ime sme imati najviše 64 karaktera.'),
  password: z
    .string()
    .min(1, 'Lozinka je obavezna.')
    .max(128, 'Lozinka sme imati najviše 128 karaktera.'),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Trenutna lozinka je obavezna.')
      .max(128, 'Lozinka sme imati najviše 128 karaktera.'),
    newPassword: passwordSchema,
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ['newPassword'],
    message: 'Nova lozinka mora biti drugačija od trenutne.',
  });

export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
