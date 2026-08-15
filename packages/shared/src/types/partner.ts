export const PARTNER_TYPES = [
  'TRAVEL_AGENCY',
  'SPORTS_CLUB',
  'CULTURAL_ARTS_SOCIETY',
  'INDIVIDUAL',
  'OTHER',
] as const;

export type PartnerType = (typeof PARTNER_TYPES)[number];

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  TRAVEL_AGENCY: 'Turistička agencija',
  SPORTS_CLUB: 'Sportski klub',
  CULTURAL_ARTS_SOCIETY: 'KUD',
  INDIVIDUAL: 'Fizičko lice',
  OTHER: 'Drugo',
};

/** A legal entity (company) rather than an individual. */
export const isLegalEntityPartnerType = (type: PartnerType): boolean => type !== 'INDIVIDUAL';

export interface PartnerDto {
  id: string;
  type: PartnerType;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  address: string;
  pib: string | null;
  registrationNumber: string | null;
  personalId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeletePartnerResult {
  id: string;
  deleted: true;
}

/** Display name regardless of whether the partner is a company or an individual. */
export const partnerDisplayName = (
  partner: Pick<PartnerDto, 'type' | 'companyName' | 'firstName' | 'lastName'>,
): string =>
  partner.type === 'INDIVIDUAL'
    ? `${partner.firstName ?? ''} ${partner.lastName ?? ''}`.trim()
    : (partner.companyName ?? '');
