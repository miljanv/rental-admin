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

/** A Serbian PIB (poreski identifikacioni broj) is always exactly 9 digits. */
export const PIB_LENGTH = 9;

/** A Serbian matični broj (company registration number) is always exactly 8 digits. */
export const REGISTRATION_NUMBER_LENGTH = 8;

/** A Serbian JMBG (jedinstveni matični broj građana) is always exactly 13 digits. */
export const JMBG_LENGTH = 13;

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
