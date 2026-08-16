import type { DriverDto, DriverStatus, EmploymentType } from '@rental-admin/shared';

export interface DriverRecord {
  id: string;
  firstName: string;
  lastName: string;
  jmbg: string;
  dateOfBirth: Date;
  residencePlace: string;
  residenceAddress: string | null;
  educationLevel: string;
  idCardNumber: string;
  drivingLicenseNumber: string;
  drivingLicenseCategory: string;
  licenseNumber: string;
  phone: string;
  email: string | null;
  jobTitle: string;
  status: DriverStatus;
  employmentType: EmploymentType;
  createdAt: Date;
  updatedAt: Date;
}

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

export const toDriverDto = (record: DriverRecord): DriverDto => ({
  id: record.id,
  firstName: record.firstName,
  lastName: record.lastName,
  jmbg: record.jmbg,
  dateOfBirth: toIsoDate(record.dateOfBirth),
  residencePlace: record.residencePlace,
  residenceAddress: record.residenceAddress,
  educationLevel: record.educationLevel,
  idCardNumber: record.idCardNumber,
  drivingLicenseNumber: record.drivingLicenseNumber,
  drivingLicenseCategory: record.drivingLicenseCategory,
  licenseNumber: record.licenseNumber,
  phone: record.phone,
  email: record.email,
  jobTitle: record.jobTitle,
  status: record.status,
  employmentType: record.employmentType,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
