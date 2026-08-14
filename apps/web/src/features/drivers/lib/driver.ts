import type { DriverDto, DriverWriteRequest } from '@rental-admin/shared';

export const driverFullName = (driver: Pick<DriverDto, 'firstName' | 'lastName'>): string =>
  `${driver.firstName} ${driver.lastName}`.trim();

export const toDriverFormValues = (driver: DriverDto): DriverWriteRequest => ({
  firstName: driver.firstName,
  lastName: driver.lastName,
  jmbg: driver.jmbg,
  dateOfBirth: driver.dateOfBirth,
  residencePlace: driver.residencePlace,
  educationLevel: driver.educationLevel,
  idCardNumber: driver.idCardNumber,
  drivingLicenseNumber: driver.drivingLicenseNumber,
  drivingLicenseCategory: driver.drivingLicenseCategory,
  licenseNumber: driver.licenseNumber,
  phone: driver.phone,
  email: driver.email,
  jobTitle: driver.jobTitle,
  status: driver.status,
});
