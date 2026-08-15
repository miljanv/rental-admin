import type { GeneratedPdfDownload } from './generated-document';

export interface ContractDocumentDto {
  id: string;
  contractId: string;
  version: number;
  generatedAt: string;
  /** Lets the client request a fresh download URL for any past version via `GET /files/:id/download`. */
  fileId: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface GeneratedContractDocumentResult extends GeneratedPdfDownload {
  document: ContractDocumentDto;
}

export interface DeleteContractDocumentResult {
  id: string;
  deleted: true;
}
