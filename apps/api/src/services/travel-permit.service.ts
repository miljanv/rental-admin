import type {
  DeleteTravelPermitResult,
  TravelPermitDto,
  TravelPermitWriteRequest,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { notFound } from '../utils/app-error';
import { logger } from '../utils/logger';
import { toTravelPermitDto, type TravelPermitRecord } from '../utils/travel-permit-mapper';
import { assertUploadedFile, deleteAttachedFile } from './file-attachment.service';

const permitInclude = { file: true } as const;

const parseDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

const assertContractExists = async (contractId: string): Promise<void> => {
  const contract = await prisma.contract.findUnique({ where: { id: contractId }, select: { id: true } });

  if (!contract) {
    throw notFound('Ugovor nije pronađen.');
  }
};

const toWriteData = (input: TravelPermitWriteRequest) => ({
  country: input.country,
  permitNumber: input.permitNumber,
  issuedAt: parseDate(input.issuedAt),
  fileId: input.fileId,
});

export const listTravelPermits = async (contractId: string): Promise<TravelPermitDto[]> => {
  await assertContractExists(contractId);

  const records = await prisma.travelPermit.findMany({
    where: { contractId },
    include: permitInclude,
    orderBy: { createdAt: 'desc' },
  });

  return records.map((record: TravelPermitRecord) => toTravelPermitDto(record));
};

export const createTravelPermit = async (
  contractId: string,
  input: TravelPermitWriteRequest,
): Promise<TravelPermitDto> => {
  await assertContractExists(contractId);
  await assertUploadedFile(input.fileId);

  const record = await prisma.travelPermit.create({
    data: { contractId, ...toWriteData(input) },
    include: permitInclude,
  });

  logger.info('Travel permit created', { contractId, permitId: record.id, country: record.country });

  return toTravelPermitDto(record);
};

export const updateTravelPermit = async (
  contractId: string,
  permitId: string,
  input: TravelPermitWriteRequest,
): Promise<TravelPermitDto> => {
  const existing = await prisma.travelPermit.findFirst({ where: { id: permitId, contractId } });

  if (!existing) {
    throw notFound('Putna dozvola nije pronađena.');
  }

  await assertUploadedFile(input.fileId);

  const record = await prisma.travelPermit.update({
    where: { id: permitId },
    data: toWriteData(input),
    include: permitInclude,
  });

  if (existing.fileId !== input.fileId) {
    await deleteAttachedFile(existing.fileId);
  }

  logger.info('Travel permit updated', { contractId, permitId });

  return toTravelPermitDto(record);
};

export const deleteTravelPermit = async (
  contractId: string,
  permitId: string,
): Promise<DeleteTravelPermitResult> => {
  const existing = await prisma.travelPermit.findFirst({ where: { id: permitId, contractId } });

  if (!existing) {
    throw notFound('Putna dozvola nije pronađena.');
  }

  await prisma.travelPermit.delete({ where: { id: permitId } });
  await deleteAttachedFile(existing.fileId);
  logger.info('Travel permit deleted', { contractId, permitId });

  return { id: permitId, deleted: true };
};
