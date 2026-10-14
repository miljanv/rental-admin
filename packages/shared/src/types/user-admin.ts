import type { UserRole } from './auth';

/** A customer company and a few headline counts for the superadmin overview. */
export interface OrganizationDto {
  id: string;
  name: string;
  isActive: boolean;
  userCount: number;
  vehicleCount: number;
  driverCount: number;
  tripCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ManagedUserDto {
  id: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  organizationId: string | null;
  organizationName: string | null;
  /** How many vehicles this user personally added. */
  vehiclesCreated: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteOrganizationResult {
  id: string;
  deleted: true;
}

export interface DeleteUserResult {
  id: string;
  deleted: true;
}
