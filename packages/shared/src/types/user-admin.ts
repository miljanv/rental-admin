import type { UserRole } from './auth';

/** What counts against an organization's limits, next to the limits themselves (null = no limit). */
export interface OrganizationUsageDto {
  vehicles: number;
  maxVehicles: number | null;
  /** Active regular users; superadmins and deactivated users do not count. */
  users: number;
  maxUsers: number | null;
}

/** A customer company and a few headline counts for the superadmin overview. */
export interface OrganizationDto {
  id: string;
  name: string;
  isActive: boolean;
  usage: OrganizationUsageDto;
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
