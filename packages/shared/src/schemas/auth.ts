import { z } from 'zod';

export const loginRequestSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, 'Username is required.')
    .max(64, 'Username must be at most 64 characters.'),
  password: z
    .string()
    .min(1, 'Password is required.')
    .max(128, 'Password must be at most 128 characters.'),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
