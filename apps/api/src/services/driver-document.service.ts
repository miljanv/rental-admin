import type {
  DeleteDriverDocumentResult,
  DriverDocumentDto,
  DriverDocumentWriteRequest,
  ExpiringDriverDocumentDto,
  ExpiringDocumentsQuery,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { badRequest, conflict, notFound } from '../utils/app-error';
import {
  toDriverDocumentDto,
  toExpiringDriverDocumentDto,
  type DriverDocumentRecord,
} from '../utils/driver-document-mapper';
import { logger } from '../utils/logger';
import * as fileService from './file.service';

const documentInclude = { file: true } as const;

const parseDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

const startOfTodayUtc = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const addUtcDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const toWriteData = (input: DriverDocumentWriteRequest) => ({
  type: input.type,
  documentNumber: input.documentNumber,
  issuedAt: parseDate(input.issuedAt),
  expiresAt: input.expiresAt ? parseDate(input.expiresAt) : null,
  employmentContractType: input.employmentContractType,
  fileId: input.fileId,
});

const isFileConflict = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  return (error as { code: unknown }).code === 'P2002';
};

const assertDriverExists = async (driverId: string): Promise<void> => {
  const driver = await prisma.driver.findUnique({ where: { id: driverId }, select: { id: true } });

  if (!driver) {
    throw notFound('Zaposleni nije pronađen.');
  }
};

const assertUploadedFile = async (fileId: string | null): Promise<void> => {
  if (!fileId) {
    return;
  }

  const file = await prisma.fileObject.findUnique({ where: { id: fileId } });

  if (!file || file.status !== 'UPLOADED') {
    throw badRequest('Sken dokumenta nije pronađen ili upload nije završen.');
  }
};

const deleteAttachedFile = async (fileId: string | null): Promise<void> => {
  if (!fileId) {
    return;
  }

  try {
    await fileService.deleteFile(fileId);
  } catch {
    logger.warn('Could not delete attached document scan', { fileId });
  }
};

export const listDriverDocuments = async (driverId: string): Promise<DriverDocumentDto[]> => {
  await assertDriverExists(driverId);

  const records = await prisma.driverDocument.findMany({
    where: { driverId },
    include: documentInclude,
    orderBy: [{ expiresAt: { sort: 'asc', nulls: 'last' } }, { issuedAt: 'desc' }],
  });

  return records.map((record: DriverDocumentRecord) => toDriverDocumentDto(record));
};

export const getDriverDocument = async (
  driverId: string,
  documentId: string,
): Promise<DriverDocumentDto> => {
  const record = await prisma.driverDocument.findFirst({
    where: { id: documentId, driverId },
    include: documentInclude,
  });

  if (!record) {
    throw notFound('Dokument nije pronađen.');
  }

  return toDriverDocumentDto(record);
};

export const createDriverDocument = async (
  driverId: string,
  input: DriverDocumentWriteRequest,
): Promise<DriverDocumentDto> => {
  await assertDriverExists(driverId);
  await assertUploadedFile(input.fileId);

  try {
    const record = await prisma.driverDocument.create({
      data: { driverId, ...toWriteData(input) },
      include: documentInclude,
    });
    logger.info('Driver document created', { driverId, documentId: record.id, type: record.type });
    return toDriverDocumentDto(record);
  } catch (error) {
    if (isFileConflict(error)) {
      throw conflict('Ovaj sken je već vezan za drugi dokument.');
    }

    throw error;
  }
};

export const updateDriverDocument = async (
  driverId: string,
  documentId: string,
  input: DriverDocumentWriteRequest,
): Promise<DriverDocumentDto> => {
  const existing = await prisma.driverDocument.findFirst({
    where: { id: documentId, driverId },
  });

  if (!existing) {
    throw notFound('Dokument nije pronađen.');
  }

  await assertUploadedFile(input.fileId);

  try {
    const record = await prisma.driverDocument.update({
      where: { id: documentId },
      data: toWriteData(input),
      include: documentInclude,
    });

    if (existing.fileId && existing.fileId !== input.fileId) {
      await deleteAttachedFile(existing.fileId);
    }

    logger.info('Driver document updated', { driverId, documentId });
    return toDriverDocumentDto(record);
  } catch (error) {
    if (isFileConflict(error)) {
      throw conflict('Ovaj sken je već vezan za drugi dokument.');
    }

    throw error;
  }
};

export const deleteDriverDocument = async (
  driverId: string,
  documentId: string,
): Promise<DeleteDriverDocumentResult> => {
  const existing = await prisma.driverDocument.findFirst({
    where: { id: documentId, driverId },
  });

  if (!existing) {
    throw notFound('Dokument nije pronađen.');
  }

  await prisma.driverDocument.delete({ where: { id: documentId } });
  await deleteAttachedFile(existing.fileId);
  logger.info('Driver document deleted', { driverId, documentId });

  return { id: documentId, deleted: true };
};

/** Removes scans before the driver row (and cascaded documents) go away. */
export const deleteFilesForDriver = async (driverId: string): Promise<void> => {
  const documents = await prisma.driverDocument.findMany({
    where: { driverId },
    select: { fileId: true },
  });

  for (const document of documents) {
    await deleteAttachedFile(document.fileId);
  }
};

export const listExpiringDocuments = async (
  query: ExpiringDocumentsQuery,
): Promise<ExpiringDriverDocumentDto[]> => {
  const until = addUtcDays(startOfTodayUtc(), query.days);

  const records = await prisma.driverDocument.findMany({
    where: {
      expiresAt: { not: null, lte: until },
    },
    include: {
      file: true,
      driver: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { expiresAt: 'asc' },
  });

  return records.map((record) => toExpiringDriverDocumentDto(record));
};
