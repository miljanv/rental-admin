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

/** Blank (or a cleared number input) means "no limit". */
const optionalLimitSchema = (label: string) =>
  z.preprocess(
    (value) =>
      value === '' ||
      value === undefined ||
      value === null ||
      (typeof value === 'number' && Number.isNaN(value))
        ? null
        : value,
    z
      .number()
      .int(`${label} mora biti ceo broj.`)
      .min(0, `${label} ne može biti negativan.`)
      .max(10_000, `${label} nije ispravan.`)
      .nullable(),
  );

export const organizationWriteSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Naziv firme je obavezan.')
    .max(120, 'Naziv firme sme imati najviše 120 karaktera.'),
  isActive: z.boolean().default(true),
  maxVehicles: optionalLimitSchema('Maks. broj vozila'),
  maxUsers: optionalLimitSchema('Maks. broj korisnika'),
});

export type OrganizationWriteRequest = z.infer<typeof organizationWriteSchema>;

/** Blank means "not entered"; stored as null. */
const optionalTextSchema = (schema: z.ZodString) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    schema.nullable().default(null),
  );

export const organizationProfileSchema = z.object({
  taxId: optionalTextSchema(
    z
      .string()
      .trim()
      .regex(/^\d{9}$/, 'PIB mora imati tačno 9 cifara.'),
  ),
  registrationNumber: optionalTextSchema(
    z
      .string()
      .trim()
      .regex(/^\d{8}$/, 'Matični broj mora imati tačno 8 cifara.'),
  ),
  address: optionalTextSchema(
    z.string().trim().max(200, 'Adresa sme imati najviše 200 karaktera.'),
  ),
  contactName: optionalTextSchema(
    z.string().trim().max(120, 'Ime kontakt osobe sme imati najviše 120 karaktera.'),
  ),
  contactPhone: optionalTextSchema(
    z
      .string()
      .trim()
      .max(40, 'Telefon sme imati najviše 40 karaktera.')
      .regex(/^[+\d\s/()-]+$/, 'Telefon sme sadržati samo cifre, razmake i + / ( ) -.'),
  ),
  contactEmail: optionalTextSchema(
    z.string().trim().max(254).email('Unesite ispravnu e-mail adresu.'),
  ),
});

export type OrganizationProfileRequest = z.infer<typeof organizationProfileSchema>;

const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Korisničko ime mora imati najmanje 3 karaktera.')
  .max(64, 'Korisničko ime sme imati najviše 64 karaktera.');

export const passwordSchema = z
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

/** A temporary password set by a superadmin; the user must replace it at the next sign-in. */
export const userPasswordResetSchema = z.object({ password: passwordSchema });

export type UserPasswordResetRequest = z.infer<typeof userPasswordResetSchema>;

export const listUsersQuerySchema = z.object({
  organizationId: z.string().trim().min(1).max(64).optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
