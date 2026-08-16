import type { PartnerDto, PartnerType } from '@rental-admin/shared';

export interface PartnerRecord {
  id: string;
  type: PartnerType;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  address: string;
  city: string;
  nickname: string | null;
  pib: string | null;
  registrationNumber: string | null;
  personalId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const toPartnerDto = (record: PartnerRecord): PartnerDto => ({
  id: record.id,
  type: record.type,
  companyName: record.companyName,
  firstName: record.firstName,
  lastName: record.lastName,
  address: record.address,
  city: record.city,
  nickname: record.nickname,
  pib: record.pib,
  registrationNumber: record.registrationNumber,
  personalId: record.personalId,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
