import type {
  GenerateEmploymentContractRequest,
  GenerateMaFormRequest,
  GeneratedDriverDocumentResult,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import type { Prisma } from '../generated/prisma/client';
import { notFound } from '../utils/app-error';
import { toDriverDocumentDto, type DriverDocumentRecord } from '../utils/driver-document-mapper';
import { logger } from '../utils/logger';
import { buildEmploymentContractPdf } from './pdf/employment-contract-pdf';
import { driverFullName, formatSerbianDate } from './pdf/format';
import { buildMaFormPdf } from './pdf/ma-form-pdf';
import * as fileService from './file.service';

const parseDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

const loadDriver = async (driverId: string) => {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });

  if (!driver) {
    throw notFound('Zaposleni nije pronađen.');
  }

  return driver;
};

/**
 * "Fiktivno zaposleni" get a new employment contract / MA form almost every
 * trip, so their generated documents are prefixed to stay distinguishable
 * from a genuinely-employed driver's paperwork at a glance.
 */
const isNominal = (employmentType: 'ACTUAL' | 'NOMINAL'): boolean => employmentType === 'NOMINAL';

/**
 * Generating Ugovor o radu / Obrazac MA again for the same driver **replaces**
 * the existing document of that type instead of piling up duplicates — the
 * whole point is to let a mistake (e.g. a missing start date typed on-site
 * without the paperwork in hand) be corrected by just re-submitting the form.
 * `generationData` is stored so the form can reopen pre-filled next time.
 */
const persistGeneratedDocument = async (params: {
  driverId: string;
  originalName: string;
  body: Buffer;
  type: 'EMPLOYMENT_CONTRACT' | 'MA_FORM';
  documentNumber?: string;
  documentNumberPrefix?: string;
  numberStamp?: string;
  issuedAt: string;
  expiresAt: string | null;
  employmentContractType: 'FIXED_TERM' | 'INDEFINITE' | null;
  generationData: Record<string, unknown>;
}): Promise<GeneratedDriverDocumentResult> => {
  const existing = await prisma.driverDocument.findFirst({
    where: { driverId: params.driverId, type: params.type },
  });

  const file = await fileService.storeGeneratedPdf({
    originalName: params.originalName,
    body: params.body,
  });

  try {
    const sharedData = {
      issuedAt: parseDate(params.issuedAt),
      expiresAt: params.expiresAt ? parseDate(params.expiresAt) : null,
      employmentContractType: params.employmentContractType,
      fileId: file.id,
      generationData: params.generationData as Prisma.InputJsonValue,
    };

    const documentNumber =
      params.documentNumber ??
      existing?.documentNumber ??
      `${params.documentNumberPrefix ?? ''}${params.numberStamp ?? ''}`;

    let record: DriverDocumentRecord;

    if (existing) {
      record = await prisma.driverDocument.update({
        where: { id: existing.id },
        data: { ...sharedData, documentNumber },
        include: { file: true },
      });
    } else {
      record = await prisma.driverDocument.create({
        data: {
          ...sharedData,
          driverId: params.driverId,
          type: params.type,
          documentNumber,
        },
        include: { file: true },
      });
    }

    if (existing?.fileId && existing.fileId !== file.id) {
      await fileService.deleteFile(existing.fileId).catch(() => undefined);
    }

    const download = await fileService.createDownloadUrl(file.id);
    logger.info('Generated driver document stored', {
      driverId: params.driverId,
      documentId: record.id,
      type: params.type,
      replaced: Boolean(existing),
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
  const nominal = isNominal(driver.employmentType);
  const namePrefix = nominal ? 'Fiktivni ugovor o radu' : 'Ugovor o radu';

  return persistGeneratedDocument({
    driverId,
    originalName: `${namePrefix} ${driverFullName(driver)} ${formatSerbianDate(input.startsAt)}.pdf`,
    body,
    type: 'EMPLOYMENT_CONTRACT',
    documentNumberPrefix: nominal ? 'FIKT-UOR-' : 'UOR-',
    numberStamp: `${input.startsAt.replaceAll('-', '')}-${Date.now().toString(36)}`,
    issuedAt: input.signedAt,
    expiresAt: input.expiresAt,
    employmentContractType: input.employmentContractType,
    generationData: input,
  });
};

export const generateMaForm = async (
  driverId: string,
  input: GenerateMaFormRequest,
): Promise<GeneratedDriverDocumentResult> => {
  const driver = await loadDriver(driverId);
  const body = await buildMaFormPdf({ driver, input });
  const nominal = isNominal(driver.employmentType);
  const namePrefix = nominal ? 'Fiktivni obrazac MA' : 'Obrazac MA';

  return persistGeneratedDocument({
    driverId,
    originalName: `${namePrefix} ${driverFullName(driver)} ${formatSerbianDate(input.insuranceStartDate)}.pdf`,
    body,
    type: 'MA_FORM',
    documentNumber: input.documentNumber,
    issuedAt: input.insuranceStartDate,
    expiresAt: null,
    employmentContractType: null,
    generationData: input,
  });
};
