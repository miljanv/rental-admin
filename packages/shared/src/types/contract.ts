import type { PartnerType } from './partner';

export const CONTRACT_STATUSES = ['DRAFT', 'SIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  DRAFT: 'Nacrt',
  SIGNED: 'Potpisan',
  IN_PROGRESS: 'U toku',
  COMPLETED: 'Završen',
  CANCELLED: 'Otkazan',
};

export interface ContractDto {
  id: string;
  partnerId: string;
  vehicleId: string | null;
  driverId: string | null;
  conclusionDate: string;
  route: string;
  serviceStartDate: string;
  serviceEndDate: string;
  passengerCount: number;
  price: number;
  advancePercentage: number;
  status: ContractStatus;
  notes: string | null;
  /**
   * Snapshot of the client's identity at signing time — deliberately
   * duplicated from Partner rather than joined live, so an already-signed
   * contract never silently changes if the partner's own record is edited
   * later. Pre-filled from the selected partner when a contract is created.
   */
  clientType: PartnerType;
  clientCompanyName: string | null;
  clientFirstName: string | null;
  clientLastName: string | null;
  clientAddress: string;
  clientPib: string | null;
  clientRegistrationNumber: string | null;
  clientPersonalId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteContractResult {
  id: string;
  deleted: true;
}

export const contractClientDisplayName = (
  contract: Pick<ContractDto, 'clientType' | 'clientCompanyName' | 'clientFirstName' | 'clientLastName'>,
): string =>
  contract.clientType === 'INDIVIDUAL'
    ? `${contract.clientFirstName ?? ''} ${contract.clientLastName ?? ''}`.trim()
    : (contract.clientCompanyName ?? '');

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Advance amount in the same currency as `price`, derived from `advancePercentage`. */
export const computeAdvanceAmount = (price: number, advancePercentage: number): number =>
  round2(price * (advancePercentage / 100));

export const computeRemainderAmount = (price: number, advancePercentage: number): number =>
  round2(price - computeAdvanceAmount(price, advancePercentage));
