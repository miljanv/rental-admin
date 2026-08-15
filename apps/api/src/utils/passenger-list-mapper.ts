import type { PassengerDto, PassengerListDto, PassengerListType } from '@rental-admin/shared';

export interface PassengerRecord {
  id: string;
  passengerListId: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PassengerListRecord {
  id: string;
  contractId: string;
  type: PassengerListType;
  createdAt: Date;
  updatedAt: Date;
  passengers: PassengerRecord[];
}

export const toPassengerDto = (record: PassengerRecord): PassengerDto => ({
  id: record.id,
  passengerListId: record.passengerListId,
  firstName: record.firstName,
  lastName: record.lastName,
  documentNumber: record.documentNumber,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

export const toPassengerListDto = (record: PassengerListRecord): PassengerListDto => ({
  id: record.id,
  contractId: record.contractId,
  type: record.type,
  passengers: record.passengers.map(toPassengerDto),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
