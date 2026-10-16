import type {
  DeleteUserResult,
  ListUsersQuery,
  ManagedUserDto,
  UserCreateRequest,
  UserRole,
  UserUpdateRequest,
} from '@rental-admin/shared';
import bcrypt from 'bcryptjs';

import { prisma } from '../config/prisma';
import { badRequest, conflict, notFound } from '../utils/app-error';
import { logger } from '../utils/logger';
import { isUniqueViolation } from '../utils/prisma-errors';
import { toManagedUserDto } from '../utils/user-admin-mapper';

/** Same cost as the bootstrap admin hash created by the first migration. */
const BCRYPT_COST = 12;

const userSelect = {
  id: true,
  username: true,
  role: true,
  isActive: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
  organization: { select: { name: true } },
  _count: { select: { createdVehicles: true } },
} as const;

const USERNAME_TAKEN_MESSAGE = 'Korisnik sa tim korisničkim imenom već postoji.';

const assertOrganizationExists = async (organizationId: string): Promise<void> => {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  });

  if (!organization) {
    throw badRequest('Izabrana firma ne postoji.');
  }
};

/** How many OTHER active superadmins there are besides `userId`. */
const countOtherActiveSuperadmins = (userId: string): Promise<number> =>
  prisma.user.count({
    where: { role: 'SUPERADMIN', isActive: true, id: { not: userId } },
  });

export const listUsers = async (query: ListUsersQuery): Promise<ManagedUserDto[]> => {
  const records = await prisma.user.findMany({
    where: query.organizationId ? { organizationId: query.organizationId } : {},
    select: userSelect,
    orderBy: [{ role: 'asc' }, { username: 'asc' }],
  });

  return records.map(toManagedUserDto);
};

export const getUser = async (id: string): Promise<ManagedUserDto> => {
  const record = await prisma.user.findUnique({ where: { id }, select: userSelect });

  if (!record) {
    throw notFound('Korisnik nije pronađen.');
  }

  return toManagedUserDto(record);
};

export const createUser = async (input: UserCreateRequest): Promise<ManagedUserDto> => {
  if (input.organizationId) {
    await assertOrganizationExists(input.organizationId);
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

  try {
    const record = await prisma.user.create({
      data: {
        username: input.username,
        passwordHash,
        role: input.role,
        isActive: input.isActive,
        organizationId: input.organizationId,
      },
      select: userSelect,
    });
    logger.info('User created', { userId: record.id, role: record.role });

    return toManagedUserDto(record);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict(USERNAME_TAKEN_MESSAGE);
    }

    throw error;
  }
};

export const updateUser = async (
  id: string,
  input: UserUpdateRequest,
  actingUserId: string,
): Promise<ManagedUserDto> => {
  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, isActive: true, organizationId: true },
  });

  if (!existing) {
    throw notFound('Korisnik nije pronađen.');
  }

  const role: UserRole = input.role ?? existing.role;
  const isActive = input.isActive ?? existing.isActive;
  // A user turned into a superadmin leaves their organization unless told otherwise.
  const organizationId =
    input.organizationId !== undefined
      ? input.organizationId
      : role === 'SUPERADMIN'
        ? null
        : existing.organizationId;

  if (role === 'USER' && !organizationId) {
    throw badRequest('Izaberite firmu za korisnika.');
  }

  if (role === 'SUPERADMIN' && organizationId) {
    throw badRequest('Superadmin ne pripada nijednoj firmi.');
  }

  if (organizationId) {
    await assertOrganizationExists(organizationId);
  }

  const losesAdminAccess =
    existing.role === 'SUPERADMIN' && existing.isActive && (role !== 'SUPERADMIN' || !isActive);

  if (losesAdminAccess) {
    if (id === actingUserId) {
      throw conflict('Ne možete sebi ukinuti superadmin pristup ni deaktivirati sopstveni nalog.');
    }

    if ((await countOtherActiveSuperadmins(id)) === 0) {
      throw conflict('Mora ostati bar jedan aktivan superadmin.');
    }
  }

  try {
    const record = await prisma.user.update({
      where: { id },
      data: {
        ...(input.username !== undefined ? { username: input.username } : {}),
        ...(input.password !== undefined
          ? { passwordHash: await bcrypt.hash(input.password, BCRYPT_COST) }
          : {}),
        role,
        isActive,
        organizationId,
      },
      select: userSelect,
    });
    logger.info('User updated', { userId: id, role: record.role, isActive: record.isActive });

    return toManagedUserDto(record);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict(USERNAME_TAKEN_MESSAGE);
    }

    throw error;
  }
};

/**
 * Only users that never created anything are deleted. A user who did is
 * deactivated instead, so the "created by" history stays attributable.
 */
export const deleteUser = async (id: string, actingUserId: string): Promise<DeleteUserResult> => {
  if (id === actingUserId) {
    throw conflict('Ne možete obrisati sopstveni nalog.');
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: {
      role: true,
      isActive: true,
      _count: {
        select: {
          createdDrivers: true,
          createdVehicles: true,
          createdCompanyExpenses: true,
          createdSuppliers: true,
          createdPartners: true,
          createdContracts: true,
          createdTransactions: true,
          createdTrips: true,
        },
      },
    },
  });

  if (!existing) {
    throw notFound('Korisnik nije pronađen.');
  }

  if (Object.values(existing._count).some((count) => count > 0)) {
    throw conflict(
      'Korisnik je kreirao zapise i ne može se obrisati. Deaktivirajte ga umesto toga.',
    );
  }

  if (existing.role === 'SUPERADMIN' && existing.isActive) {
    if ((await countOtherActiveSuperadmins(id)) === 0) {
      throw conflict('Mora ostati bar jedan aktivan superadmin.');
    }
  }

  await prisma.user.delete({ where: { id } });
  logger.info('User deleted', { userId: id });

  return { id, deleted: true };
};
