import type {
  DeleteAbsenceAttestationResult,
  GenerateAbsenceAttestationRequest,
  GeneratedAbsenceAttestationResult,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { notFound } from '../utils/app-error';
import {
  toAbsenceAttestationDto,
  type AbsenceAttestationRecord,
} from '../utils/absence-attestation-mapper';
import { logger } from '../utils/logger';
import { buildAbsenceAttestationPdf } from './pdf/absence-attestation-pdf';
import { driverFullName, formatSerbianDate, parseDateTimeLocal } from './pdf/format';
import * as fileService from './file.service';

const attestationInclude = { file: true } as const;

const parseDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

const loadDriver = async (driverId: string) => {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });

  if (!driver) {
    throw notFound('Vozač nije pronađen.');
  }

  return driver;
};

export const listAbsenceAttestations = async (driverId: string) => {
  await loadDriver(driverId);

  const records = await prisma.driverAbsenceAttestation.findMany({
    where: { driverId },
    include: attestationInclude,
    orderBy: { periodFrom: 'desc' },
  });

  return records.map((record: AbsenceAttestationRecord) => toAbsenceAttestationDto(record));
};

export const generateAbsenceAttestation = async (
  driverId: string,
  input: GenerateAbsenceAttestationRequest,
): Promise<GeneratedAbsenceAttestationResult> => {
  const driver = await loadDriver(driverId);
  const body = await buildAbsenceAttestationPdf({ driver, input });
  const originalName = `Potvrda o odsustvu ${driverFullName(driver)} ${formatSerbianDate(input.periodFrom)}.pdf`;
  const file = await fileService.storeGeneratedPdf({ originalName, body });

  try {
    const record = await prisma.driverAbsenceAttestation.create({
      data: {
        driverId,
        periodFrom: parseDateTimeLocal(input.periodFrom),
        periodTo: parseDateTimeLocal(input.periodTo),
        reason: input.reason,
        otherReason: input.otherReason,
        place: input.place,
        issuedAt: parseDate(input.issuedAt),
        startedWorkAt: parseDate(input.startedWorkAt),
        fileId: file.id,
      },
      include: attestationInclude,
    });

    const download = await fileService.createDownloadUrl(file.id);
    logger.info('Absence attestation generated', { driverId, attestationId: record.id });

    return {
      attestation: toAbsenceAttestationDto(record),
      downloadUrl: download.downloadUrl,
      fileName: download.fileName,
      expiresIn: download.expiresIn,
    };
  } catch (error) {
    await fileService.deleteFile(file.id).catch(() => undefined);
    throw error;
  }
};

export const deleteAbsenceAttestation = async (
  driverId: string,
  attestationId: string,
): Promise<DeleteAbsenceAttestationResult> => {
  const existing = await prisma.driverAbsenceAttestation.findFirst({
    where: { id: attestationId, driverId },
  });

  if (!existing) {
    throw notFound('Potvrda o odsustvu nije pronađena.');
  }

  await prisma.driverAbsenceAttestation.delete({ where: { id: attestationId } });
  await fileService.deleteFile(existing.fileId).catch(() => undefined);
  logger.info('Absence attestation deleted', { driverId, attestationId });

  return { id: attestationId, deleted: true };
};

export const deleteAbsenceFilesForDriver = async (driverId: string): Promise<void> => {
  const attestations = await prisma.driverAbsenceAttestation.findMany({
    where: { driverId },
    select: { fileId: true },
  });

  await prisma.driverAbsenceAttestation.deleteMany({ where: { driverId } });

  for (const attestation of attestations) {
    await fileService.deleteFile(attestation.fileId).catch(() => undefined);
  }
};
