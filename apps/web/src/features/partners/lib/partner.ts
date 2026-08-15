import { partnerDisplayName, type PartnerDto, type PartnerWriteRequest } from '@rental-admin/shared';

export const partnerLabel = (partner: PartnerDto): string => partnerDisplayName(partner);

export const toPartnerFormValues = (partner: PartnerDto): PartnerWriteRequest => ({
  type: partner.type,
  companyName: partner.companyName,
  firstName: partner.firstName,
  lastName: partner.lastName,
  address: partner.address,
  pib: partner.pib,
  registrationNumber: partner.registrationNumber,
  personalId: partner.personalId,
});
