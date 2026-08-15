import {
  COMPANY,
  DEFAULT_DRIVER_DUTIES,
  generateEmploymentContractSchema,
  generateMaFormSchema,
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
  residenceStreet: '',
  trialPeriodDays: 5,
  weeklyHours: 40,
  jobDescription: DEFAULT_DRIVER_DUTIES,
});

export const emptyMaForm = (driver: DriverDto): MaFormValues => ({
  gender: 'MALE',
  parentName: '',
  municipality: driver.residencePlace,
  residenceStreet: '',
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
