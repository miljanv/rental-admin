import type { ManagedUserDto, OrganizationDto, UserRole } from '@rental-admin/shared';

export interface OrganizationRecord {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { users: number; vehicles: number; drivers: number; trips: number };
}

export interface ManagedUserRecord {
  id: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  organization: { name: string } | null;
  _count: { createdVehicles: number };
}

export const toOrganizationDto = (record: OrganizationRecord): OrganizationDto => ({
  id: record.id,
  name: record.name,
  isActive: record.isActive,
  userCount: record._count.users,
  vehicleCount: record._count.vehicles,
  driverCount: record._count.drivers,
  tripCount: record._count.trips,
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
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
