export const DRIVER_STATUSES = ['ACTIVE', 'SICK_LEAVE', 'VACATION', 'INACTIVE'] as const;

export type DriverStatus = (typeof DRIVER_STATUSES)[number];

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  ACTIVE: 'Aktivan',
  SICK_LEAVE: 'Bolovanje',
  VACATION: 'Godišnji',
  INACTIVE: 'Neaktivan',
};

export interface DriverDto {
  id: string;
  firstName: string;
  lastName: string;
  jmbg: string;
  dateOfBirth: string;
  residencePlace: string;
  educationLevel: string;
  idCardNumber: string;
  drivingLicenseNumber: string;
  drivingLicenseCategory: string;
  licenseNumber: string;
  phone: string;
  email: string;
  jobTitle: string;
  status: DriverStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteDriverResult {
  id: string;
  deleted: true;
}
