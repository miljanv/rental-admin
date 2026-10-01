export const PARTNER_TYPES = [
  'TRAVEL_AGENCY',
  'SPORTS_CLUB',
  'CULTURAL_ARTS_SOCIETY',
  'BUS_OPERATOR',
  'FACTORY',
  'INDIVIDUAL',
  'SCHOOL',
  'HOTEL',
  'MUNICIPALITY',
  'OTHER',
] as const;

export type PartnerType = (typeof PARTNER_TYPES)[number];

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  TRAVEL_AGENCY: 'Turistička agencija',
  SPORTS_CLUB: 'Sport',
  CULTURAL_ARTS_SOCIETY: 'Kultura',
  BUS_OPERATOR: 'Autobuski prevoznik',
  FACTORY: 'Fabrika',
  INDIVIDUAL: 'Fizičko lice',
  SCHOOL: 'Škola',
  HOTEL: 'Hotel',
  MUNICIPALITY: 'Opština',
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
  /** Street and house number. */
  address: string;
  city: string;
  /** Common/informal name the office actually recognizes the partner by. */
  nickname: string | null;
  pib: string | null;
  registrationNumber: string | null;
  personalId: string | null;
  bankAccounts: PartnerBankAccountDto[];
  createdAt: string;
  updatedAt: string;
}

export interface PartnerBankAccountDto {
  id: string;
  accountNumber: string;
}

export interface DeletePartnerResult {
  id: string;
  deleted: true;
}

export const PARTNER_LEDGER_ENTRY_TYPES = ['OPENING', 'INVOICE', 'PAYMENT'] as const;

export type PartnerLedgerEntryType = (typeof PARTNER_LEDGER_ENTRY_TYPES)[number];

export const PARTNER_LEDGER_ENTRY_TYPE_LABELS: Record<PartnerLedgerEntryType, string> = {
  OPENING: 'Početni saldo',
  INVOICE: 'Faktura',
  PAYMENT: 'Uplata',
};

export interface PartnerLedgerEntryDto {
  id: string;
  type: PartnerLedgerEntryType;
  postedAt: string;
  documentType: string;
  documentNumber: string | null;
  externalDocumentNumber: string | null;
  description: string;
  dueDate: string | null;
  remainingAmount: number | null;
  daysOverdue: number | null;
  debit: number;
  credit: number;
  balance: number;
  sourceType: 'TRIP_INVOICE' | 'TRIP_SERIES_INVOICE' | 'FINANCE_TRANSACTION' | 'OPENING';
  sourceId: string | null;
}

export interface PartnerLedgerSummaryDto {
  openingDebit: number;
  openingCredit: number;
  openingBalance: number;
  periodDebit: number;
  periodCredit: number;
  endingDebit: number;
  endingCredit: number;
  endingBalance: number;
}

export interface PartnerLedgerDto {
  partner: PartnerDto;
  from: string | null;
  to: string | null;
  entries: PartnerLedgerEntryDto[];
  summary: PartnerLedgerSummaryDto;
}

/** Display name regardless of whether the partner is a company or an individual. */
export const partnerDisplayName = (
  partner: Pick<PartnerDto, 'type' | 'companyName' | 'firstName' | 'lastName'>,
): string =>
  partner.type === 'INDIVIDUAL'
    ? `${partner.firstName ?? ''} ${partner.lastName ?? ''}`.trim()
    : (partner.companyName ?? '');

/** "Ulica i broj, Mesto" — the two address parts joined for display or for copying onto a contract snapshot. */
export const partnerFullAddress = (partner: Pick<PartnerDto, 'address' | 'city'>): string =>
  [partner.address, partner.city].filter(Boolean).join(', ');

/**
 * Legal/display name plus the nickname in parentheses when there is one —
 * the whole point of the nickname is recognizing a partner nobody calls by
 * its formal name, so every partner picker should show it, not just the list.
 */
export const partnerSelectLabel = (
  partner: Pick<PartnerDto, 'type' | 'companyName' | 'firstName' | 'lastName' | 'nickname'>,
): string => {
  const name = partnerDisplayName(partner);
  return partner.nickname ? `${name} (${partner.nickname})` : name;
};
