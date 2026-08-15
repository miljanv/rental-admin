import type { ContractDocumentDto } from '@rental-admin/shared';

import type { FileObjectRecord } from './file-mapper';

export interface ContractDocumentRecord {
  id: string;
  contractId: string;
  version: number;
  generatedAt: Date;
  file: FileObjectRecord;
}

export const toContractDocumentDto = (record: ContractDocumentRecord): ContractDocumentDto => ({
  id: record.id,
  contractId: record.contractId,
  version: record.version,
  generatedAt: record.generatedAt.toISOString(),
  fileId: record.file.id,
  originalName: record.file.originalName,
  mimeType: record.file.mimeType,
  size: record.file.size,
});
