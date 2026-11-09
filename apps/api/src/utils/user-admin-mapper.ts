import type { ManagedUserDto, OrganizationDto, UserRole } from '@rental-admin/shared';

export interface OrganizationRecord {
  id: string;
  name: string;
  isActive: boolean;
  maxVehicles: number | null;
  maxUsers: number | null;
  taxId: string | null;
  registrationNumber: string | null;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** `users` and `vehicles` hold only what counts against the limits. */
  _count: { users: number; vehicles: number; drivers: number; trips: number };
}

export interface ManagedUserRecord {
  id: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  organizationId: string | null;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  organization: { name: string } | null;
  _count: { createdVehicles: number };
}

export const toOrganizationDto = (
  record: OrganizationRecord,
  lastActivityAt: Date | null = null,
): OrganizationDto => ({
  id: record.id,
  name: record.name,
  isActive: record.isActive,
  profile: {
    taxId: record.taxId,
    registrationNumber: record.registrationNumber,
    address: record.address,
    contactName: record.contactName,
    contactPhone: record.contactPhone,
    contactEmail: record.contactEmail,
  },
  usage: {
    vehicles: record._count.vehicles,
    maxVehicles: record.maxVehicles,
    users: record._count.users,
    maxUsers: record.maxUsers,
  },
  userCount: record._count.users,
  vehicleCount: record._count.vehicles,
  driverCount: record._count.drivers,
  tripCount: record._count.trips,
  lastActivityAt: lastActivityAt?.toISOString() ?? null,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

/** Never includes the password hash: it is not part of the selected record. */
export const toManagedUserDto = (record: ManagedUserRecord): ManagedUserDto => ({
  id: record.id,
  username: record.username,
  role: record.role,
  isActive: record.isActive,
  organizationId: record.organizationId,
  organizationName: record.organization?.name ?? null,
  vehiclesCreated: record._count.createdVehicles,
  mustChangePassword: record.mustChangePassword,
  lastLoginAt: record.lastLoginAt?.toISOString() ?? null,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
