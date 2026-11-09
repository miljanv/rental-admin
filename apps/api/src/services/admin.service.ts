import type { AdminSummaryDto } from '@rental-admin/shared';

import { prismaUnscoped } from '../config/prisma';
import { LIMITED_USER_WHERE, LIMITED_VEHICLE_WHERE } from './organization-limit.service';

/**
 * Totals across every organization. Vehicles and users count the same way as
 * the per-organization limits, so the cards add up to the table below them.
 */
export const getAdminSummary = async (): Promise<AdminSummaryDto> => {
  const [organizationGroups, enabledVehicles, activeUsers] = await Promise.all([
    prismaUnscoped.organization.groupBy({ by: ['isActive'], _count: { _all: true } }),
    prismaUnscoped.vehicle.count({ where: LIMITED_VEHICLE_WHERE }),
    prismaUnscoped.user.count({ where: { ...LIMITED_USER_WHERE, organizationId: { not: null } } }),
  ]);

  const countWhere = (isActive: boolean): number =>
    organizationGroups.find((group) => group.isActive === isActive)?._count._all ?? 0;

  return {
    activeOrganizations: countWhere(true),
    suspendedOrganizations: countWhere(false),
    enabledVehicles,
    activeUsers,
  };
};
