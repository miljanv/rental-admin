import type { PaymentAllocationDto, SettlementTargetDto, TransactionDto } from './transaction';

export interface OpeningBalanceDto {
  id: string;
  partyType: 'PARTNER' | 'SUPPLIER';
  partyId: string;
  kind: 'DEBT' | 'CREDIT';
  amount: number;
  asOfDate: string;
  note: string | null;
  status: 'DRAFT' | 'CONFIRMED' | 'REVERSED';
  confirmedAt: string | null;
  confirmedById: string | null;
  reversedAt: string | null;
  reversedById: string | null;
  reversalReason: string | null;
  allocatedAmount: number;
  remainingAmount: number;
  creditTransaction: TransactionDto | null;
  payments: TransactionDto[];
  history: FinanceAuditEventDto[];
}
export interface AllocationPlanDto {
  token: string;
  reference: string | null;
  ignoreReference: boolean;
  availableAmount: number;
  allocatedAmount: number;
  remainingAmount: number;
  allocations: Array<SettlementTargetDto & { amount: number }>;
}
export interface FinanceAuditEventDto {
  id: string;
  action: string;
  reason: string | null;
  actor: string | null;
  createdAt: string;
}
/** Largest leftover (RSD) a payment may add to its invoice with "Zaokruži". */
export const ROUNDING_TOLERANCE = 1;

/** A payment that overpays its single, fully settled invoice by a few para. */
export interface PaymentRoundingDto {
  allocationId: string;
  label: string;
  amount: number;
}
export interface PaymentAllocationsDto {
  allocations: Array<PaymentAllocationDto & { label: string }>;
  history: FinanceAuditEventDto[];
  rounding: PaymentRoundingDto | null;
}
