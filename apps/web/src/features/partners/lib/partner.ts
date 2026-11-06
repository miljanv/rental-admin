import {
  partnerDisplayName,
  partnerSelectLabel,
  type PartnerDto,
  type PartnerWriteRequest,
} from '@rental-admin/shared';

export const partnerLabel = (partner: PartnerDto): string => partnerDisplayName(partner);

export const toPartnerFormValues = (partner: PartnerDto): PartnerWriteRequest => ({
  type: partner.type,
  companyName: partner.companyName,
  firstName: partner.firstName,
  lastName: partner.lastName,
  address: partner.address,
  city: partner.city,
  nickname: partner.nickname,
  pib: partner.pib,
  registrationNumber: partner.registrationNumber,
  personalId: partner.personalId,
  bankAccounts: partner.bankAccounts.map((account) => ({ accountNumber: account.accountNumber })),
});

const normalizeName = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('sr');

/**
 * The registered partner a free-text client name refers to, if any — compared
 * case-insensitively against the legal name, the picker label, and the
 * nickname, so typing an existing partner's name never creates a second
 * "client" next to the real one.
 */
export const findPartnerByName = (
  partners: PartnerDto[],
  name: string | null | undefined,
): PartnerDto | undefined => {
  const target = name ? normalizeName(name) : '';

  if (!target) {
    return undefined;
  }

  return partners.find((partner) =>
    [partnerDisplayName(partner), partnerSelectLabel(partner), partner.nickname ?? ''].some(
      (label) => label.trim() !== '' && normalizeName(label) === target,
    ),
  );
};
