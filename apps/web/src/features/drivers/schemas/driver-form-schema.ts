import { driverWriteSchema, type DriverWriteRequest } from '@rental-admin/shared';

export const driverFormSchema = driverWriteSchema;

export type DriverFormValues = DriverWriteRequest;

export const EMPTY_DRIVER_FORM: DriverFormValues = {
  firstName: '',
  lastName: '',
  jmbg: '',
  dateOfBirth: '',
  residencePlace: '',
  educationLevel: '',
  idCardNumber: '',
  drivingLicenseNumber: '',
  drivingLicenseCategory: '',
  licenseNumber: '',
  phone: '',
  email: '',
  jobTitle: '',
  status: 'ACTIVE',
};
