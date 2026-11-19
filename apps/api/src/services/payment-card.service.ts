import type { PaymentCardDto, PaymentCardWriteRequest } from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { conflict, notFound } from '../utils/app-error';
import { requireOrganizationId } from '../utils/tenant-context';
import { recordAuditEvent } from './audit.service';

const cardSelect = { id: true, name: true, isActive: true } as const;

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';

const duplicateName = (name: string) => conflict(`Kartica „${name}“ već postoji.`);

export const listPaymentCards = async (): Promise<PaymentCardDto[]> =>
  prisma.paymentCard.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    select: cardSelect,
  });

export const createPaymentCard = async (
  input: PaymentCardWriteRequest,
): Promise<PaymentCardDto> => {
  try {
    const card = await prisma.paymentCard.create({
      data: { organizationId: requireOrganizationId(), name: input.name, isActive: input.isActive },
      select: cardSelect,
    });
    await recordAuditEvent({
      action: 'PAYMENT_CARD_SAVED',
      entityType: 'PaymentCard',
      entityId: card.id,
      metadata: { name: card.name },
    });
    return card;
  } catch (error) {
    if (isUniqueViolation(error)) throw duplicateName(input.name);
    throw error;
  }
};

/** Cards are switched off, never deleted, so old expenses keep their card name. */
export const updatePaymentCard = async (
  id: string,
  input: PaymentCardWriteRequest,
): Promise<PaymentCardDto> => {
  const existing = await prisma.paymentCard.findFirst({ where: { id }, select: { id: true } });

  if (!existing) {
    throw notFound('Kartica nije pronađena.');
  }

  try {
    const card = await prisma.paymentCard.update({
      where: { id },
      data: { name: input.name, isActive: input.isActive },
      select: cardSelect,
    });
    await recordAuditEvent({
      action: 'PAYMENT_CARD_SAVED',
      entityType: 'PaymentCard',
      entityId: card.id,
      metadata: { name: card.name, isActive: card.isActive },
    });
    return card;
  } catch (error) {
    if (isUniqueViolation(error)) throw duplicateName(input.name);
    throw error;
  }
};
