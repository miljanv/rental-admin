import type {
  GenerateEmploymentContractRequest,
  GenerateMaFormRequest,
  GeneratedDriverDocumentResult,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { notFound } from '../utils/app-error';
import { toDriverDocumentDto } from '../utils/driver-document-mapper';
import { logger } from '../utils/logger';
import { buildEmploymentContractPdf } from './pdf/employment-contract-pdf';
import { driverFullName, formatSerbianDate } from './pdf/format';
import { buildMaFormPdf } from './pdf/ma-form-pdf';
import * as fileService from './file.service';

const parseDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

const loadDriver = async (driverId: string) => {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });

  if (!driver) {
    throw notFound('Vozač nije pronađen.');
  }

  return driver;
};

const persistGeneratedDocument = async (params: {
  driverId: string;
  originalName: string;
  body: Buffer;
  type: 'EMPLOYMENT_CONTRACT' | 'MA_FORM';
  documentNumber: string;
  issuedAt: string;
  expiresAt: string | null;
  employmentContractType: 'FIXED_TERM' | 'INDEFINITE' | null;
}): Promise<GeneratedDriverDocumentResult> => {
  const file = await fileService.storeGeneratedPdf({
    originalName: params.originalName,
    body: params.body,
  });

  try {
    const record = await prisma.driverDocument.create({
      data: {
        driverId: params.driverId,
        type: params.type,
        documentNumber: params.documentNumber,
        issuedAt: parseDate(params.issuedAt),
        expiresAt: params.expiresAt ? parseDate(params.expiresAt) : null,
        employmentContractType: params.employmentContractType,
        fileId: file.id,
      },
      include: { file: true },
    });

    const download = await fileService.createDownloadUrl(file.id);
    logger.info('Generated driver document stored', {
      driverId: params.driverId,
      documentId: record.id,
      type: params.type,
    });

    return {
      document: toDriverDocumentDto(record),
      downloadUrl: download.downloadUrl,
      fileName: download.fileName,
      expiresIn: download.expiresIn,
    };
  } catch (error) {
    await fileService.deleteFile(file.id).catch(() => undefined);
    throw error;
  }
};

export const generateEmploymentContract = async (
  driverId: string,
  input: GenerateEmploymentContractRequest,
): Promise<GeneratedDriverDocumentResult> => {
  const driver = await loadDriver(driverId);
  const body = await buildEmploymentContractPdf({ driver, input });
  const stamp = `${input.startsAt.replaceAll('-', '')}-${Date.now().toString(36)}`;

  return persistGeneratedDocument({
    driverId,
    originalName: `Ugovor o radu ${driverFullName(driver)} ${formatSerbianDate(input.startsAt)}.pdf`,
    body,
    type: 'EMPLOYMENT_CONTRACT',
    documentNumber: `UOR-${stamp}`,
    issuedAt: input.signedAt,
    expiresAt: input.expiresAt,
    employmentContractType: input.employmentContractType,
  });
};

export const generateMaForm = async (
  driverId: string,
  input: GenerateMaFormRequest,
): Promise<GeneratedDriverDocumentResult> => {
  const driver = await loadDriver(driverId);
  const body = await buildMaFormPdf({ driver, input });
  const stamp = `${input.insuranceStartDate.replaceAll('-', '')}-${Date.now().toString(36)}`;

  return persistGeneratedDocument({
    driverId,
    originalName: `Obrazac MA ${driverFullName(driver)} ${formatSerbianDate(input.insuranceStartDate)}.pdf`,
    body,
    type: 'MA_FORM',
    documentNumber: `MA-${stamp}`,
    issuedAt: input.insuranceStartDate,
    expiresAt: null,
    employmentContractType: null,
  });
};
