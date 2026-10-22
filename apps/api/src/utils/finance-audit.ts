import type { TransactionClient } from '../config/prisma';
import type { Prisma } from '../generated/prisma/client';
import { getTenantContext, requireOrganizationId } from './tenant-context';

export const recordFinanceAudit = async (
  tx: TransactionClient,
  entityId: string,
  action: string,
  details: unknown,
  reason?: string,
): Promise<void> => {
  await tx.financeAuditEvent.create({
    data: {
      organizationId: requireOrganizationId(),
      actorId: getTenantContext()?.userId ?? null,
      entityId,
      action,
      reason,
      // Store a detached JSON snapshot, including dates as ISO strings.
      details: JSON.parse(JSON.stringify(details)) as Prisma.InputJsonValue,
    },
  });
};
