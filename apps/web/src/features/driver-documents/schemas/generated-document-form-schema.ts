import {
  COMPANY,
  DEFAULT_DRIVER_DUTIES,
  defaultMaRegisteredAt,
  generateEmploymentContractSchema,
  generateMaFormSchema,
  MA_REGISTRATION_TYPE,
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

export const emptyMaForm = (
  driver: DriverDto,
  options?: { contractSignedAt?: string | null; nextDocumentNumber?: string },
): MaFormValues => {
  const signedAt = options?.contractSignedAt?.slice(0, 10);

  return {
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
    registrationType: MA_REGISTRATION_TYPE,
    documentNumber: options?.nextDocumentNumber ?? '',
    registeredAt: signedAt ? defaultMaRegisteredAt(signedAt) : `${localTodayIso()}T09:15`,
  };
};

/** Same idea as `employmentContractFormValues`, for Obrazac MA. */
export const maFormValues = (
  driver: DriverDto,
  existing?: DriverDocumentDto,
  options?: { contractSignedAt?: string | null; nextDocumentNumber?: string },
): MaFormValues => {
  const defaults = emptyMaForm(driver, options);
  const previous = existing?.generationData as Partial<MaFormValues> | undefined;

  return {
    ...defaults,
    ...previous,
    registrationType: MA_REGISTRATION_TYPE,
    documentNumber: existing?.documentNumber || previous?.documentNumber || defaults.documentNumber,
    registeredAt: previous?.registeredAt || defaults.registeredAt,
  };
};
