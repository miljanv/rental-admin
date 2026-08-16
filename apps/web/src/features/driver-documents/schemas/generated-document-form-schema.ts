import {
  COMPANY,
  DEFAULT_DRIVER_DUTIES,
  generateEmploymentContractSchema,
  generateMaFormSchema,
  type DriverDocumentDto,
  type DriverDto,
  type GenerateEmploymentContractInput,
  type GenerateMaFormInput,
} from '@rental-admin/shared';

import { localTodayIso } from '@/features/driver-documents/lib/document';

export const employmentContractFormSchema = generateEmploymentContractSchema;
export const maFormSchema = generateMaFormSchema;

export type EmploymentContractFormValues = GenerateEmploymentContractInput;
export type MaFormValues = GenerateMaFormInput;

export const emptyEmploymentContractForm = (driver: DriverDto): EmploymentContractFormValues => ({
  employmentContractType: 'INDEFINITE',
  startsAt: localTodayIso(),
  expiresAt: '',
  signedAt: localTodayIso(),
  netSalary: 69_000,
  transportAllowance: 2296.5,
  mealAllowance: 500,
  holidayAllowance: 500,
  workplace: `${COMPANY.city}, ${COMPANY.streetAddress}`,
  municipality: driver.residencePlace,
  residenceStreet: driver.residenceAddress ?? '',
  trialPeriodDays: 5,
  weeklyHours: 40,
  jobDescription: DEFAULT_DRIVER_DUTIES,
});

/**
 * Pre-fills from the last submitted payload when correcting an existing
 * document, so "izmeni" never means retyping the whole contract from
 * scratch — falls back to fresh driver-derived defaults otherwise.
 */
export const employmentContractFormValues = (
  driver: DriverDto,
  existing?: DriverDocumentDto,
): EmploymentContractFormValues =>
  (existing?.generationData as EmploymentContractFormValues | undefined) ??
  emptyEmploymentContractForm(driver);

export const emptyMaForm = (driver: DriverDto): MaFormValues => ({
  gender: 'MALE',
  parentName: '',
  municipality: driver.residencePlace,
  residenceStreet: driver.residenceAddress ?? '',
  apartment: '',
  citizenship: COMPANY.country,
  insuranceStartDate: localTodayIso(),
  occupation: driver.jobTitle,
  qualification: driver.educationLevel,
  weeklyHours: 40,
  insuranceBasis: '101',
  employmentKind: 'PERMANENT',
  workplace: COMPANY.city,
  companyRegistrationNumber: COMPANY.registrationNumber,
  activityCode: '',
  activity: COMPANY.activity,
});

/** Same idea as `employmentContractFormValues`, for Obrazac MA. */
export const maFormValues = (driver: DriverDto, existing?: DriverDocumentDto): MaFormValues =>
  (existing?.generationData as MaFormValues | undefined) ?? emptyMaForm(driver);
