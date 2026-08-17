import type { ContractDto, ContractStatus, PartnerType } from '@rental-admin/shared';

export interface ContractRecord {
  id: string;
  partnerId: string;
  vehicleId: string | null;
  driverId: string | null;
  conclusionDate: Date;
  origin: string;
  destination: string;
  serviceStartDate: Date;
  serviceEndDate: Date;
  passengerCount: number;
  price: number;
  advancePercentage: number;
  status: ContractStatus;
  notes: string | null;
  isInternational: boolean;
  clientType: PartnerType;
  clientCompanyName: string | null;
  clientFirstName: string | null;
  clientLastName: string | null;
  clientAddress: string;
  clientPib: string | null;
  clientRegistrationNumber: string | null;
  clientPersonalId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

export const toContractDto = (record: ContractRecord): ContractDto => ({
  id: record.id,
  partnerId: record.partnerId,
  vehicleId: record.vehicleId,
  driverId: record.driverId,
  conclusionDate: toIsoDate(record.conclusionDate),
  origin: record.origin,
  destination: record.destination,
  serviceStartDate: toIsoDate(record.serviceStartDate),
  serviceEndDate: toIsoDate(record.serviceEndDate),
  passengerCount: record.passengerCount,
  price: record.price,
  advancePercentage: record.advancePercentage,
  status: record.status,
  notes: record.notes,
  isInternational: record.isInternational,
  clientType: record.clientType,
  clientCompanyName: record.clientCompanyName,
  clientFirstName: record.clientFirstName,
  clientLastName: record.clientLastName,
  clientAddress: record.clientAddress,
  clientPib: record.clientPib,
  clientRegistrationNumber: record.clientRegistrationNumber,
  clientPersonalId: record.clientPersonalId,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
