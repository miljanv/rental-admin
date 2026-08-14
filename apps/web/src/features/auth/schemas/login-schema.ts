import { loginRequestSchema } from '@rental-admin/shared';

export const loginFormSchema = loginRequestSchema;

export type LoginFormValues = {
  username: string;
  password: string;
};
