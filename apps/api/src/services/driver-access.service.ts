import type { DriverAccessLinkCreatedDto, DriverAccessLinkDto } from '@rental-admin/shared';

import { prisma, prismaUnscoped, type TransactionClient } from '../config/prisma';
import { badRequest, notFound } from '../utils/app-error';
import {
  generateDriverAccessToken,
  hashDriverAccessToken,
  isWellFormedDriverAccessToken,
} from '../utils/driver-access-token';
import { logger } from '../utils/logger';
import { requireOrganizationId } from '../utils/tenant-context';
import { recordAuditEvent } from './audit.service';

/** Don't write `lastUsedAt` on every request a driver makes. */
const LAST_USED_RESOLUTION_MS = 60_000;

const loadDriver = async (driverId: string): Promise<{ id: string; status: string }> => {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { id: true, status: true },
  });

  if (!driver) {
    throw notFound('Vozač nije pronađen.');
  }

  return driver;
};

const activeLink = (driverId: string) =>
  prisma.driverAccessToken.findFirst({
    where: { driverId, revokedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, lastUsedAt: true },
  });

export const getDriverAccessLink = async (driverId: string): Promise<DriverAccessLinkDto> => {
  await loadDriver(driverId);
  const link = await activeLink(driverId);

  return {
    active: Boolean(link),
    createdAt: link?.createdAt.toISOString() ?? null,
    lastUsedAt: link?.lastUsedAt?.toISOString() ?? null,
  };
};

/** Revokes every active link of a driver. Returns how many were revoked. */
export const revokeDriverAccessLinks = async (
  driverId: string,
  tx: TransactionClient = prisma,
): Promise<number> => {
  const result = await tx.driverAccessToken.updateMany({
    where: { driverId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return result.count;
};

/**
 * Creates the driver's personal link and revokes the previous one. The token
 * is returned only here; the database keeps its hash.
 */
export const createDriverAccessLink = async (
  driverId: string,
): Promise<DriverAccessLinkCreatedDto> => {
  const driver = await loadDriver(driverId);

  if (driver.status === 'INACTIVE') {
    throw badRequest('Neaktivan vozač ne može dobiti link. Prvo ga aktivirajte.');
  }

  const token = generateDriverAccessToken();
  const created = await prisma.$transaction(async (tx) => {
    await revokeDriverAccessLinks(driverId, tx);

    return tx.driverAccessToken.create({
      data: {
        organizationId: requireOrganizationId(),
        driverId,
        tokenHash: hashDriverAccessToken(token),
      },
      select: { id: true, createdAt: true },
    });
  });

  logger.info('Driver access link created', { driverId });
  await recordAuditEvent({
    action: 'DRIVER_LINK_CREATED',
    entityType: 'Driver',
    entityId: driverId,
  });

  return { token, createdAt: created.createdAt.toISOString() };
};

export const revokeDriverAccessLink = async (driverId: string): Promise<DriverAccessLinkDto> => {
  await loadDriver(driverId);
  const revoked = await revokeDriverAccessLinks(driverId);

  if (revoked > 0) {
    logger.info('Driver access link revoked', { driverId });
    await recordAuditEvent({
      action: 'DRIVER_LINK_REVOKED',
      entityType: 'Driver',
      entityId: driverId,
    });
  }

  return { active: false, createdAt: null, lastUsedAt: null };
};

export interface DriverAccess {
  tokenId: string;
  driverId: string;
  organizationId: string;
}

/**
 * Resolves a token from the driver portal before any tenant is known, so it
 * uses the unscoped client. Null for an unknown or revoked token, an inactive
 * driver, or a suspended organization.
 */
export const findDriverAccess = async (token: string): Promise<DriverAccess | null> => {
  if (!isWellFormedDriverAccessToken(token)) {
    return null;
  }

  const row = await prismaUnscoped.driverAccessToken.findUnique({
    where: { tokenHash: hashDriverAccessToken(token) },
    select: {
      id: true,
      organizationId: true,
      driverId: true,
      revokedAt: true,
      lastUsedAt: true,
      driver: { select: { status: true, organizationId: true } },
      organization: { select: { isActive: true } },
    },
  });

  if (
    !row ||
    row.revokedAt ||
    row.driver.status === 'INACTIVE' ||
    row.driver.organizationId !== row.organizationId ||
    !row.organization.isActive
  ) {
    return null;
  }

  const now = Date.now();

  if (!row.lastUsedAt || now - row.lastUsedAt.getTime() > LAST_USED_RESOLUTION_MS) {
    await prismaUnscoped.driverAccessToken
      .update({ where: { id: row.id }, data: { lastUsedAt: new Date(now) } })
      .catch((error: unknown) => {
        logger.warn('Could not record driver link use', { tokenId: row.id, error });
      });
  }

  return { tokenId: row.id, driverId: row.driverId, organizationId: row.organizationId };
};
