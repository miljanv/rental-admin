import type {
  DeleteVehicleDocumentResult,
  VehicleDocumentDto,
  VehicleDocumentWriteRequest,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { notFound } from '../utils/app-error';
import { logger } from '../utils/logger';
import {
  toVehicleDocumentDto,
  type VehicleDocumentRecord,
} from '../utils/vehicle-document-mapper';
import { assertUploadedFile, deleteAttachedFile } from './file-attachment.service';

const documentInclude = { file: true } as const;

const parseDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

const assertVehicleExists = async (vehicleId: string): Promise<void> => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true },
  });

  if (!vehicle) {
    throw notFound('Vozilo nije pronađeno.');
  }
};

const toWriteData = (input: VehicleDocumentWriteRequest) => ({
  type: input.type,
  issuedAt: input.issuedAt ? parseDate(input.issuedAt) : null,
  fileId: input.fileId,
});

export const listVehicleDocuments = async (vehicleId: string): Promise<VehicleDocumentDto[]> => {
  await assertVehicleExists(vehicleId);

  const records = await prisma.vehicleDocument.findMany({
    where: { vehicleId },
    include: documentInclude,
    orderBy: { createdAt: 'desc' },
  });

  return records.map((record: VehicleDocumentRecord) => toVehicleDocumentDto(record));
};

export const getVehicleDocument = async (
  vehicleId: string,
  documentId: string,
): Promise<VehicleDocumentDto> => {
  const record = await prisma.vehicleDocument.findFirst({
    where: { id: documentId, vehicleId },
    include: documentInclude,
  });

  if (!record) {
    throw notFound('Dokument nije pronađen.');
  }

  return toVehicleDocumentDto(record);
};

export const createVehicleDocument = async (
  vehicleId: string,
  input: VehicleDocumentWriteRequest,
): Promise<VehicleDocumentDto> => {
  await assertVehicleExists(vehicleId);
  await assertUploadedFile(input.fileId);

  const record = await prisma.vehicleDocument.create({
    data: { vehicleId, ...toWriteData(input) },
    include: documentInclude,
  });

  logger.info('Vehicle document created', { vehicleId, documentId: record.id, type: record.type });

  return toVehicleDocumentDto(record);
};

export const updateVehicleDocument = async (
  vehicleId: string,
  documentId: string,
  input: VehicleDocumentWriteRequest,
): Promise<VehicleDocumentDto> => {
  const existing = await prisma.vehicleDocument.findFirst({
    where: { id: documentId, vehicleId },
  });

  if (!existing) {
    throw notFound('Dokument nije pronađen.');
  }

  await assertUploadedFile(input.fileId);

  const record = await prisma.vehicleDocument.update({
    where: { id: documentId },
    data: toWriteData(input),
    include: documentInclude,
  });

  if (existing.fileId && existing.fileId !== input.fileId) {
    await deleteAttachedFile(existing.fileId);
  }

  logger.info('Vehicle document updated', { vehicleId, documentId });

  return toVehicleDocumentDto(record);
};

export const deleteVehicleDocument = async (
  vehicleId: string,
  documentId: string,
): Promise<DeleteVehicleDocumentResult> => {
  const existing = await prisma.vehicleDocument.findFirst({
    where: { id: documentId, vehicleId },
  });

  if (!existing) {
    throw notFound('Dokument nije pronađen.');
  }

  await prisma.vehicleDocument.delete({ where: { id: documentId } });
  await deleteAttachedFile(existing.fileId);
  logger.info('Vehicle document deleted', { vehicleId, documentId });

  return { id: documentId, deleted: true };
};

/** Removes scans before the vehicle row (and cascaded documents) go away. */
export const deleteFilesForVehicle = async (vehicleId: string): Promise<void> => {
  const records = await prisma.vehicleDocument.findMany({
    where: { vehicleId },
    select: { fileId: true },
  });

  for (const record of records) {
    await deleteAttachedFile(record.fileId);
  }
};
