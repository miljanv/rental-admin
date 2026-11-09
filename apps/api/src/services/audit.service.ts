import type {
  AdminFinanceAuditEventDto,
  AuditAction,
  AuditEntityType,
  AuditEventDto,
  ListAuditEventsQuery,
  PaginationMeta,
} from '@rental-admin/shared';

import { prismaUnscoped } from '../config/prisma';
import type { Prisma } from '../generated/prisma/client';
import { buildPaginationMeta } from '../utils/api-response';
import { logger } from '../utils/logger';
import { getRequestContext } from '../utils/request-context';
import { getTenantContext } from '../utils/tenant-context';

export interface AuditEventInput {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  /** Defaults to the organization the request works in. */
  organizationId?: string | null;
  /** Defaults to the signed-in user. */
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
}

const SECRET_KEY = /password|token|secret|storagekey|hash/i;

/** Drops anything that looks like a credential or storage key, at any depth. */
export const sanitizeAuditMetadata = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sanitizeAuditMetadata);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, entry]) => !SECRET_KEY.test(key) && entry !== undefined)
        .map(([key, entry]) => [key, sanitizeAuditMetadata(entry)]),
    );
  }

  return value;
};

/**
 * Writes one audit entry. Call it after the action succeeded. It never throws:
 * a failed write is logged and the action the user asked for still completes.
 */
export const recordAuditEvent = async (event: AuditEventInput): Promise<void> => {
  try {
    const tenant = getTenantContext();
    const request = getRequestContext();
    const metadata = sanitizeAuditMetadata({
      ...event.metadata,
      userAgent: request?.userAgent ?? undefined,
    }) as Prisma.InputJsonObject;

    await prismaUnscoped.auditEvent.create({
      data: {
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId ?? null,
        organizationId:
          event.organizationId !== undefined
            ? event.organizationId
            : (tenant?.organizationId ?? null),
        actorUserId: event.actorUserId !== undefined ? event.actorUserId : (tenant?.userId ?? null),
        metadata,
        ip: request?.ip ?? null,
      },
    });
  } catch (error) {
    logger.error('Audit event not recorded', error, {
      action: event.action,
      entityId: event.entityId ?? null,
    });
  }
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Inclusive calendar days, read as UTC dates. */
const toCreatedAtFilter = (
  from: string | undefined,
  to: string | undefined,
): Prisma.DateTimeFilter | undefined => {
  if (!from && !to) {
    return undefined;
  }

  return {
    ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
    ...(to ? { lt: new Date(new Date(`${to}T00:00:00.000Z`).getTime() + DAY_MS) } : {}),
  };
};

const participants = {
  actor: { select: { id: true, username: true } },
  organization: { select: { id: true, name: true } },
} as const;

export const listAuditEvents = async (
  query: ListAuditEventsQuery,
): Promise<{ events: AuditEventDto[]; pagination: PaginationMeta }> => {
  const createdAt = toCreatedAtFilter(query.from, query.to);
  const where: Prisma.AuditEventWhereInput = {
    ...(query.organizationId ? { organizationId: query.organizationId } : {}),
    ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
    ...(query.action ? { action: query.action } : {}),
    ...(createdAt ? { createdAt } : {}),
  };

  const [total, records] = await Promise.all([
    prismaUnscoped.auditEvent.count({ where }),
    prismaUnscoped.auditEvent.findMany({
      where,
      include: participants,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    events: records.map((record) => ({
      id: record.id,
      createdAt: record.createdAt.toISOString(),
      action: record.action,
      entityType: record.entityType,
      entityId: record.entityId,
      actor: record.actor,
      organization: record.organization,
      metadata: (record.metadata as Record<string, unknown> | null) ?? null,
      ip: record.ip,
    })),
    pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
  };
};

/** The finance log stays where it is; this only reads it for the same admin screen. */
export const listFinanceAuditEvents = async (
  query: ListAuditEventsQuery,
): Promise<{ events: AdminFinanceAuditEventDto[]; pagination: PaginationMeta }> => {
  const createdAt = toCreatedAtFilter(query.from, query.to);
  const where: Prisma.FinanceAuditEventWhereInput = {
    ...(query.organizationId ? { organizationId: query.organizationId } : {}),
    ...(query.actorUserId ? { actorId: query.actorUserId } : {}),
    ...(createdAt ? { createdAt } : {}),
  };

  const [total, records] = await Promise.all([
    prismaUnscoped.financeAuditEvent.count({ where }),
    prismaUnscoped.financeAuditEvent.findMany({
      where,
      include: participants,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    events: records.map((record) => ({
      id: record.id,
      createdAt: record.createdAt.toISOString(),
      action: record.action,
      entityId: record.entityId,
      reason: record.reason,
      actor: record.actor,
      organization: record.organization,
    })),
    pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
  };
};
