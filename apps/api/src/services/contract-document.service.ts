import {
  contractRouteLabel,
  type ContractDocumentDto,
  type DeleteContractDocumentResult,
  type GeneratedContractDocumentResult,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { notFound } from '../utils/app-error';
import { toContractDocumentDto, type ContractDocumentRecord } from '../utils/contract-document-mapper';
import { logger } from '../utils/logger';
import { buildPassengerTransportContractPdf } from './pdf/passenger-transport-contract-pdf';
import { deleteAttachedFile } from './file-attachment.service';
import * as fileService from './file.service';

const documentInclude = { file: true } as const;

const loadContract = async (contractId: string) => {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });

  if (!contract) {
    throw notFound('Ugovor nije pronađen.');
  }

  return contract;
};

export const listContractDocuments = async (contractId: string): Promise<ContractDocumentDto[]> => {
  await loadContract(contractId);

  const records = await prisma.contractDocument.findMany({
    where: { contractId },
    include: documentInclude,
    orderBy: { version: 'desc' },
  });

  return records.map((record: ContractDocumentRecord) => toContractDocumentDto(record));
};

export const generateContractDocument = async (
  contractId: string,
): Promise<GeneratedContractDocumentResult> => {
  const contract = await loadContract(contractId);
  const [vehicle, driver, lastDocument] = await Promise.all([
    contract.vehicleId ? prisma.vehicle.findUnique({ where: { id: contract.vehicleId } }) : null,
    contract.driverId ? prisma.driver.findUnique({ where: { id: contract.driverId } }) : null,
    prisma.contractDocument.findFirst({ where: { contractId }, orderBy: { version: 'desc' } }),
  ]);

  const version = (lastDocument?.version ?? 0) + 1;
  const body = await buildPassengerTransportContractPdf({ contract, vehicle, driver });
  const originalName = `Ugovor o prevozu putnika ${contractRouteLabel(contract)} v${version}.pdf`;
  const file = await fileService.storeGeneratedPdf({ originalName, body });

  try {
    const record = await prisma.contractDocument.create({
      data: { contractId, version, fileId: file.id },
      include: documentInclude,
    });

    const download = await fileService.createDownloadUrl(file.id);
    logger.info('Contract document generated', { contractId, documentId: record.id, version });

    return {
      document: toContractDocumentDto(record),
      downloadUrl: download.downloadUrl,
      fileName: download.fileName,
      expiresIn: download.expiresIn,
    };
  } catch (error) {
    await fileService.deleteFile(file.id).catch(() => undefined);
    throw error;
  }
};

export const deleteContractDocument = async (
  contractId: string,
  documentId: string,
): Promise<DeleteContractDocumentResult> => {
  const existing = await prisma.contractDocument.findFirst({
    where: { id: documentId, contractId },
  });

  if (!existing) {
    throw notFound('Dokument nije pronađen.');
  }

  await prisma.contractDocument.delete({ where: { id: documentId } });
  await deleteAttachedFile(existing.fileId);
  logger.info('Contract document deleted', { contractId, documentId });

  return { id: documentId, deleted: true };
};
