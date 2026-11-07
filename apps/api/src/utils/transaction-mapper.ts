import type {
  Currency,
  PaymentMethod,
  TransactionCategory,
  TransactionDto,
  TransactionDriverDto,
  TransactionSourceType,
  TransactionStatus,
  TransactionType,
} from '@rental-admin/shared';

export interface TransactionVehicleRecord {
  id: string;
  make: string;
  model: string;
  licensePlate: string;
}

export interface TransactionDriverRecord {
  id: string;
  firstName: string;
  lastName: string;
}

export interface FinanceTransactionRecord {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  occurredAt: Date;
  paymentMethod: PaymentMethod;
  note: string | null;
  supplier: string | null;
  supplierId: string | null;
  partner: string | null;
  partnerId: string | null;
  route: string | null;
  vehicleId: string | null;
  driverId: string | null;
  contractId: string | null;
  isAdvance: boolean;
  status: TransactionStatus;
  linkedTransactionId: string | null;
  sourceType: TransactionSourceType;
  sourceId: string | null;
  statementNumber: string | null;
  bankReference: string | null;
  currency: Currency;
  currencyAmount: number | null;
  exchangeRate: number | null;
  paymentAllocations: Array<{
    amount: number;
    currencyAmount: number | null;
    exchangeDifference: number | null;
  }>;
  createdAt: Date;
  updatedAt: Date;
  vehicle: TransactionVehicleRecord | null;
  driver: TransactionDriverRecord | null;
}

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

/**
 * Dinars an allocation used up on the payment side. An EUR allocation closes `amount` dinars
 * of the invoice at the invoice rate; the payment's own rate adds the exchange difference.
 */
export const paymentSideAmount = (allocation: {
  amount: number;
  exchangeDifference: number | null;
}): number => allocation.amount + (allocation.exchangeDifference ?? 0);

const toVehicleDto = (vehicle: TransactionVehicleRecord): TransactionDto['vehicle'] => ({
  id: vehicle.id,
  make: vehicle.make,
  model: vehicle.model,
  licensePlate: vehicle.licensePlate,
});

const toDriverDto = (driver: TransactionDriverRecord): TransactionDriverDto => ({
  id: driver.id,
  firstName: driver.firstName,
  lastName: driver.lastName,
});

export const toTransactionDto = (record: FinanceTransactionRecord): TransactionDto => {
  const allocatedAmount = roundMoney(
    record.paymentAllocations.reduce((sum, allocation) => sum + paymentSideAmount(allocation), 0),
  );
  const unallocatedCurrencyAmount =
    record.currency === 'RSD' || record.currencyAmount === null
      ? null
      : Math.max(
          0,
          roundMoney(
            record.currencyAmount -
              record.paymentAllocations.reduce(
                (sum, allocation) => sum + (allocation.currencyAmount ?? 0),
                0,
              ),
          ),
        );

  return {
    id: record.id,
    type: record.type,
    category: record.category,
    amount: record.amount,
    occurredAt: toIsoDate(record.occurredAt),
    paymentMethod: record.paymentMethod,
    note: record.note,
    supplier: record.supplier,
    supplierId: record.supplierId,
    partner: record.partner,
    partnerId: record.partnerId,
    route: record.route,
    vehicle: record.vehicle ? toVehicleDto(record.vehicle) : null,
    driver: record.driver ? toDriverDto(record.driver) : null,
    contractId: record.contractId,
    isAdvance: record.isAdvance,
    status: record.status,
    linkedTransactionId: record.linkedTransactionId,
    sourceType: record.sourceType,
    sourceId: record.sourceId,
    statementNumber: record.statementNumber,
    bankReference: record.bankReference,
    currency: record.currency,
    currencyAmount: record.currencyAmount,
    exchangeRate: record.exchangeRate,
    unallocatedCurrencyAmount,
    allocatedAmount,
    unallocatedAmount: Math.max(0, Math.round((record.amount - allocatedAmount) * 100) / 100),
    allocationCount: record.paymentAllocations.length,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
};
