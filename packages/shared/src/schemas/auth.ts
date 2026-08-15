import { z } from 'zod';

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
