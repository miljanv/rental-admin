import { z } from 'zod';

import { USER_ROLES } from '../types/auth';

export const organizationIdParamsSchema = z.object({
  id: z.string().trim().min(1, 'Firma je obavezna.').max(64),
});

export type OrganizationIdParams = z.infer<typeof organizationIdParamsSchema>;

export const userIdParamsSchema = z.object({
  id: z.string().trim().min(1, 'Korisnik je obavezan.').max(64),
});

export type UserIdParams = z.infer<typeof userIdParamsSchema>;

export const organizationWriteSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Naziv firme je obavezan.')
    .max(120, 'Naziv firme sme imati najviše 120 karaktera.'),
  isActive: z.boolean().default(true),
});

export type OrganizationWriteRequest = z.infer<typeof organizationWriteSchema>;

const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Korisničko ime mora imati najmanje 3 karaktera.')
  .max(64, 'Korisničko ime sme imati najviše 64 karaktera.');

const passwordSchema = z
  .string()
  .min(8, 'Lozinka mora imati najmanje 8 karaktera.')
  .max(128, 'Lozinka sme imati najviše 128 karaktera.');

const organizationRefSchema = z.string().trim().min(1).max(64).nullable();

interface RoleOrganization {
  role?: (typeof USER_ROLES)[number] | undefined;
  organizationId?: string | null | undefined;
}

const addOrganizationIssue = (context: z.RefinementCtx, message: string): void => {
  context.addIssue({ code: 'custom', path: ['organizationId'], message });
};

/** A SUPERADMIN has no organization; every other role needs exactly one. */
const checkRoleOrganization = (value: RoleOrganization, context: z.RefinementCtx): void => {
  if (value.role === 'USER' && !value.organizationId) {
    addOrganizationIssue(context, 'Izaberite firmu za korisnika.');
  }

  if (value.role === 'SUPERADMIN' && value.organizationId) {
    addOrganizationIssue(context, 'Superadmin ne pripada nijednoj firmi.');
  }
};

/**
 * An update may omit the organization because the stored one still applies, so
 * only explicit contradictions are rejected here. The service re-checks the
 * merged result against the stored user.
 */
const checkRoleOrganizationChange = (value: RoleOrganization, context: z.RefinementCtx): void => {
  if (value.role === 'USER' && value.organizationId === null) {
    addOrganizationIssue(context, 'Izaberite firmu za korisnika.');
  }

  if (value.role === 'SUPERADMIN' && value.organizationId) {
    addOrganizationIssue(context, 'Superadmin ne pripada nijednoj firmi.');
  }
};

export const userCreateSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    role: z.enum(USER_ROLES).default('USER'),
    organizationId: organizationRefSchema.default(null),
    isActive: z.boolean().default(true),
  })
  .superRefine(checkRoleOrganization);

export type UserCreateRequest = z.infer<typeof userCreateSchema>;

/**
 * Every field is optional so one form can change just a password or just the
 * organization. A blank password means "leave it unchanged".
 */
export const userUpdateSchema = z
  .object({
    username: usernameSchema.optional(),
    password: z
      .union([passwordSchema, z.literal('')])
      .optional()
      .transform((value) => (value ? value : undefined))
      .optional(),
    role: z.enum(USER_ROLES).optional(),
    organizationId: organizationRefSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine(checkRoleOrganizationChange);

export type UserUpdateRequest = z.infer<typeof userUpdateSchema>;

export const listUsersQuerySchema = z.object({
  organizationId: z.string().trim().min(1).max(64).optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
