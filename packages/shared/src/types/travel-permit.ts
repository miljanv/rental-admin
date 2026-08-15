export interface TravelPermitDto {
  id: string;
  contractId: string;
  country: string;
  permitNumber: string;
  issuedAt: string;
  fileId: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteTravelPermitResult {
  id: string;
  deleted: true;
}
