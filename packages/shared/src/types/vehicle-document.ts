import type { AttachedFileDto } from './file';

export const VEHICLE_DOCUMENT_TYPES = ['REGISTRATION'] as const;

export type VehicleDocumentType = (typeof VEHICLE_DOCUMENT_TYPES)[number];

export const VEHICLE_DOCUMENT_TYPE_LABELS: Record<VehicleDocumentType, string> = {
  REGISTRATION: 'Saobraćajna dozvola',
};

export interface VehicleDocumentDto {
  id: string;
  vehicleId: string;
  type: VehicleDocumentType;
  issuedAt: string | null;
  file: AttachedFileDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteVehicleDocumentResult {
  id: string;
  deleted: true;
}
