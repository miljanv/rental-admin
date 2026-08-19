import { z } from 'zod';

import { COMPANY } from '../company';
import { JOB_TITLE_MAX_LENGTH } from '../types/driver';
import { GENDERS, MA_EMPLOYMENT_KINDS, MA_REGISTRATION_TYPE } from '../types/generated-document';
import { isoDateTimeLocalSchema } from './absence-attestation';
import { driverIdSchema, isoDateSchema } from './driver';
import { employmentContractTypeSchema } from './driver-document';

export const genderSchema = z.enum(GENDERS);
export const maEmploymentKindSchema = z.enum(MA_EMPLOYMENT_KINDS);

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} je obavezno.`)
    .max(max, `${label} sme imati najviše ${max} karaktera.`);

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(''), z.null()])
    .optional()
    .transform((value) => (value ? value : null));

const moneySchema = (label: string) =>
  z.coerce
    .number()
    .finite(`${label} mora biti broj.`)
    .min(0, `${label} ne može biti negativna.`)
    .max(10_000_000, `${label} je prevelika.`);

export const generateEmploymentContractSchema = z
  .object({
    employmentContractType: employmentContractTypeSchema,
    startsAt: isoDateSchema,
    expiresAt: z
      .union([isoDateSchema, z.literal(''), z.null()])
      .optional()
      .transform((value) => (value ? value : null)),
    signedAt: isoDateSchema,
    netSalary: moneySchema('Zarada'),
    transportAllowance: moneySchema('Naknada za prevoz'),
    mealAllowance: moneySchema('Naknada za ishranu'),
    holidayAllowance: moneySchema('Regres'),
    workplace: requiredText('Mesto rada', 160),
    municipality: requiredText('Opština prebivališta', 80),
    residenceStreet: requiredText('Ulica i broj', 120),
    trialPeriodDays: z.coerce.number().int().min(0).max(180).default(5),
    weeklyHours: z.coerce.number().int().min(1).max(48).default(40),
    jobDescription: optionalText(800),
  })
  .superRefine((value, ctx) => {
    if (value.employmentContractType === 'FIXED_TERM' && !value.expiresAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['expiresAt'],
        message: 'Ugovor na određeno mora imati datum isteka.',
      });
    }

    if (value.employmentContractType === 'INDEFINITE' && value.expiresAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['expiresAt'],
        message: 'Ugovor na neodređeno nema datum isteka.',
      });
    }

    if (value.expiresAt && value.expiresAt < value.startsAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['expiresAt'],
        message: 'Datum isteka ne može biti pre stupanja na rad.',
      });
    }
  });

export type GenerateEmploymentContractInput = z.input<typeof generateEmploymentContractSchema>;
export type GenerateEmploymentContractRequest = z.output<typeof generateEmploymentContractSchema>;

export const generateMaFormSchema = z.object({
  gender: genderSchema,
  parentName: requiredText('Ime jednog roditelja', 80),
  municipality: requiredText('Opština prebivališta', 80),
  residenceStreet: requiredText('Ulica i broj', 120),
  apartment: optionalText(40),
  citizenship: requiredText('Državljanstvo', 80).default(COMPANY.country),
  insuranceStartDate: isoDateSchema,
  occupation: requiredText('Zanimanje', JOB_TITLE_MAX_LENGTH),
  qualification: requiredText('Kvalifikacija', 80),
  weeklyHours: z.coerce.number().int().min(1).max(48).default(40),
  insuranceBasis: requiredText('Osnov osiguranja', 80).default('101'),
  employmentKind: maEmploymentKindSchema,
  workplace: requiredText('Mesto rada', 160),
  companyRegistrationNumber: requiredText('Matični broj', 20),
  activityCode: requiredText('Šifra delatnosti', 20),
  activity: requiredText('Delatnost', 120).default(COMPANY.activity),
  registrationType: z.literal(MA_REGISTRATION_TYPE).default(MA_REGISTRATION_TYPE),
  documentNumber: requiredText('Delovodni broj', 80),
  registeredAt: isoDateTimeLocalSchema,
});

export type GenerateMaFormInput = z.input<typeof generateMaFormSchema>;
export type GenerateMaFormRequest = z.output<typeof generateMaFormSchema>;

export const generatedDocumentParamsSchema = z.object({
  id: driverIdSchema,
});
