import {
  USER_ROLES,
  type ManagedUserDto,
  type UserCreateRequest,
  type UserUpdateRequest,
} from '@rental-admin/shared';
import { z } from 'zod';

export type UserFormMode = 'create' | 'edit';

const PASSWORD_TOO_SHORT = 'Lozinka mora imati najmanje 8 karaktera.';
const PASSWORD_TOO_LONG = 'Lozinka sme imati najviše 128 karaktera.';

/**
 * Form-friendly shape of a user: everything is a plain string or boolean, with
 * an empty string standing for "no organization". The API enforces the same
 * rules again, so this is only about fast feedback.
 */
export const createUserFormSchema = (mode: UserFormMode) =>
  z
    .object({
      username: z
        .string()
        .trim()
        .min(3, 'Korisničko ime mora imati najmanje 3 karaktera.')
        .max(64, 'Korisničko ime sme imati najviše 64 karaktera.'),
      // When editing, a blank password means "leave it as it is".
      password:
        mode === 'create'
          ? z.string().min(8, PASSWORD_TOO_SHORT).max(128, PASSWORD_TOO_LONG)
          : z
              .string()
              .max(128, PASSWORD_TOO_LONG)
              .refine((value) => value === '' || value.length >= 8, PASSWORD_TOO_SHORT),
      role: z.enum(USER_ROLES),
      organizationId: z.string(),
      isActive: z.boolean(),
    })
    .superRefine((value, context) => {
      if (value.role === 'USER' && !value.organizationId) {
        context.addIssue({
          code: 'custom',
          path: ['organizationId'],
          message: 'Izaberite firmu za korisnika.',
        });
      }
    });

export type UserFormValues = z.infer<ReturnType<typeof createUserFormSchema>>;

export const EMPTY_USER_FORM: UserFormValues = {
  username: '',
  password: '',
  role: 'USER',
  organizationId: '',
  isActive: true,
};

export const userToFormValues = (user: ManagedUserDto): UserFormValues => ({
  username: user.username,
  password: '',
  role: user.role,
  organizationId: user.organizationId ?? '',
  isActive: user.isActive,
});

/** A superadmin belongs to no organization, whatever the select still holds. */
const organizationFor = (values: UserFormValues): string | null =>
  values.role === 'SUPERADMIN' ? null : values.organizationId;

export const toUserCreateRequest = (values: UserFormValues): UserCreateRequest => ({
  username: values.username,
  password: values.password,
  role: values.role,
  organizationId: organizationFor(values),
  isActive: values.isActive,
});

export const toUserUpdateRequest = (values: UserFormValues): UserUpdateRequest => ({
  username: values.username,
  ...(values.password ? { password: values.password } : {}),
  role: values.role,
  organizationId: organizationFor(values),
  isActive: values.isActive,
});
