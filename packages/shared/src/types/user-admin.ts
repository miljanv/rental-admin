import type { UserRole } from './auth';

/** What counts against an organization's limits, next to the limits themselves (null = no limit). */
export interface OrganizationUsageDto {
  vehicles: number;
  maxVehicles: number | null;
  /** Active regular users; superadmins and deactivated users do not count. */
  users: number;
  maxUsers: number | null;
}

/** Company details the superadmin keeps on file. Every field is optional. */
export interface OrganizationProfileDto {
  /** PIB, 9 digits. */
  taxId: string | null;
  /** Matični broj, 8 digits. */
  registrationNumber: string | null;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
}

/** A customer company and a few headline counts for the superadmin overview. */
export interface OrganizationDto {
  id: string;
  name: string;
  isActive: boolean;
  profile: OrganizationProfileDto;
  usage: OrganizationUsageDto;
  userCount: number;
  vehicleCount: number;
  driverCount: number;
  tripCount: number;
  /** Latest sign-in of any of its users; null when nobody has signed in yet. */
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Everything the superadmin sees on one organization's detail page. */
export interface OrganizationOverviewDto {
  organization: OrganizationDto;
  vehicles: { enabled: number; disabled: number; max: number | null };
  /** Regular users of the organization; only active ones count against the limit. */
  users: { active: number; inactive: number; max: number | null };
  drivers: number;
  trips: number;
  /** Issued invoices (računi), not pro forma ones. */
  invoices: number;
  /** Uploaded files and the bytes they take in storage. */
  files: number;
  storageBytes: number;
}

/** Headline numbers across every organization, for the top of the admin screen. */
export interface AdminSummaryDto {
  activeOrganizations: number;
  suspendedOrganizations: number;
  /** Vehicles that count against limits, i.e. enabled ones. */
  enabledVehicles: number;
  /** Active regular users; superadmins do not count. */
  activeUsers: number;
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
  mustChangePassword: boolean;
  lastLoginAt: string | null;
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
