import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bankStatementEntryWriteSchema, listTransactionsQuerySchema } from '@rental-admin/shared';

vi.mock('../config/prisma', () => {
  const model = () =>
    Object.fromEntries(
      [
        'findUnique',
        'findUniqueOrThrow',
        'findFirst',
        'findMany',
        'create',
        'update',
        'updateMany',
        'delete',
        'count',
        'groupBy',
        'upsert',
      ].map((name) => [name, vi.fn()]),
    );
  return {
    prisma: {
      $transaction: vi.fn(),
      $queryRaw: vi.fn(),
      financeTransaction: model(),
      paymentAllocation: model(),
      partner: model(),
      partnerBankAccount: model(),
      supplier: model(),
      companyExpense: model(),
      trip: model(),
    },
  };
});
vi.mock('./supplier.service', () => ({
  findSupplierByBankAccount: vi.fn(),
  findSupplierIdByName: vi.fn(),
  rememberSupplierBankAccount: vi.fn(),
}));

import { prisma } from '../config/prisma';
import type { FinanceTransactionRecord } from '../utils/transaction-mapper';
import { findSupplierByBankAccount, findSupplierIdByName } from './supplier.service';
import {
  createPaymentAllocation,
  deleteTransaction,
  importBankStatementXml,
  listTransactions,
  updateBankStatementEntry,
} from './transaction.service';

const date = new Date('2026-10-10T00:00:00Z');
const supplier = { id: 'supplier-1', name: 'Supplier DOO' };
const partner = {
  id: 'partner-1',
  type: 'COMPANY',
  companyName: 'Customer DOO',
  firstName: null,
  lastName: null,
  nickname: null,
};
const expense = {
  id: 'bill-1',
  supplierId: supplier.id,
  supplier: supplier.name,
  amountWithVat: 100,
  invoiceNumber: '123/26',
  issuedAt: new Date('2026-10-01'),
  paidAt: null,
};
const trip = {
  id: 'trip-1',
  partnerId: partner.id,
  partner,
  clientName: null,
  invoiceGroupId: null,
  invoiceGrossAmount: 100,
  price: 100,
  invoicedAt: new Date('2026-10-01'),
  paidAt: null,
  referenceNumber: '123/26',
  departureDate: new Date('2026-10-01'),
  origin: 'A',
  destination: 'B',
  invoiceDescription: null,
};
let rows: FinanceTransactionRecord[];
let allocations: Array<{
  id: string;
  transactionId: string;
  targetType: 'COMPANY_EXPENSE' | 'TRIP_INVOICE' | 'TRIP_SERIES_INVOICE';
  targetId: string;
  amount: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}>;

const hydrate = (id: string): FinanceTransactionRecord => {
  const row = rows.find((candidate) => candidate.id === id)!;
  return {
    ...row,
    paymentAllocations: allocations.filter((allocation) => allocation.transactionId === id),
  };
};
const xml = ({
  amount = 100,
  benefit = 'debit',
  reference = '',
  fitId = 'bank-1',
  name = 'Supplier DOO',
} = {}): string =>
  `<statement><acctid>160-555-01</acctid><stmtnumber>10</stmtnumber><stmttrn><benefit>${benefit}</benefit><trnamt>${amount}</trnamt><dtposted>2026-10-10</dtposted><fitid>${fitId}</fitid><payeeinfo><name>${name}</name></payeeinfo><payeeaccountinfo><acctid>160-12345-67</acctid></payeeaccountinfo><payeerefnumber>${reference}</payeerefnumber><purpose>Payment</purpose></stmttrn></statement>`;

beforeEach(() => {
  vi.resetAllMocks();
  rows = [];
  allocations = [];
  vi.mocked(prisma.$transaction).mockImplementation((callback) => {
    if (typeof callback !== 'function') throw new Error('Expected transaction callback');
    return callback(prisma);
  });
  vi.mocked(findSupplierByBankAccount).mockResolvedValue(supplier);
  vi.mocked(findSupplierIdByName).mockResolvedValue(supplier.id);
  vi.mocked(prisma.partnerBankAccount.findUnique).mockResolvedValue({ partner } as never);
  vi.mocked(prisma.supplier.findUniqueOrThrow).mockResolvedValue(supplier as never);
  vi.mocked(prisma.partner.findUniqueOrThrow).mockResolvedValue(partner as never);
  vi.mocked(prisma.companyExpense.findMany).mockResolvedValue([expense] as never);
  vi.mocked(prisma.companyExpense.findUnique).mockResolvedValue(expense as never);
  vi.mocked(prisma.trip.findMany).mockResolvedValue([trip] as never);
  vi.mocked(prisma.trip.findUnique).mockResolvedValue(trip as never);
  vi.mocked(prisma.financeTransaction.findFirst).mockImplementation((args) => {
    const clauses = args?.where?.OR ?? [];
    const row = rows.find((candidate) =>
      clauses.some(
        (clause) =>
          candidate.sourceId === clause.sourceId &&
          (!clause.bankReference || candidate.bankReference === clause.bankReference),
      ),
    );
    return (row ? hydrate(row.id) : null) as never;
  });
  vi.mocked(prisma.financeTransaction.findUnique).mockImplementation(
    (args) =>
      (rows.some((row) => row.id === args.where.id) ? hydrate(args.where.id!) : null) as never,
  );
  vi.mocked(prisma.financeTransaction.findUniqueOrThrow).mockImplementation(
    (args) => hydrate(args.where.id!) as never,
  );
  vi.mocked(prisma.financeTransaction.create).mockImplementation((args) => {
    const row = {
      ...args.data,
      id: `payment-${rows.length + 1}`,
      vehicle: null,
      driver: null,
      createdAt: date,
      updatedAt: date,
      paymentAllocations: [],
    } as FinanceTransactionRecord;
    rows.push(row);
    return hydrate(row.id) as never;
  });
  vi.mocked(prisma.financeTransaction.update).mockImplementation((args) => {
    const row = rows.find((candidate) => candidate.id === args.where.id)!;
    Object.assign(row, args.data);
    return hydrate(row.id) as never;
  });
  vi.mocked(prisma.paymentAllocation.groupBy).mockImplementation((args) => {
    const relevant = allocations.filter(
      (allocation) => allocation.targetType === args.where?.targetType,
    );
    const totals = new Map<string, number>();
    for (const allocation of relevant)
      totals.set(allocation.targetId, (totals.get(allocation.targetId) ?? 0) + allocation.amount);
    return [...totals].map(([targetId, amount]) => ({ targetId, _sum: { amount } })) as never;
  });
  vi.mocked(prisma.paymentAllocation.upsert).mockImplementation((args) => {
    const key = args.where.transactionId_targetType_targetId!;
    const existing = allocations.find(
      (item) =>
        item.transactionId === key.transactionId &&
        item.targetType === key.targetType &&
        item.targetId === key.targetId,
    );
    if (existing) {
      const amount = args.update.amount;
      existing.amount =
        typeof amount === 'number' ? amount : existing.amount + (amount?.increment ?? 0);
      return existing as never;
    }
    const allocation = {
      ...args.create,
      id: `allocation-${allocations.length + 1}`,
      createdAt: date,
      updatedAt: date,
    } as (typeof allocations)[number];
    allocations.push(allocation);
    return allocation as never;
  });
  vi.mocked(prisma.paymentAllocation.findFirst).mockImplementation(
    () => (allocations.length ? { transaction: { occurredAt: date } } : null) as never,
  );
  vi.mocked(prisma.paymentAllocation.findMany).mockImplementation(() => [...allocations] as never);
  vi.mocked(prisma.financeTransaction.delete).mockImplementation((args) => {
    const record = hydrate(args.where.id!);
    rows = rows.filter((row) => row.id !== args.where.id);
    allocations = allocations.filter((allocation) => allocation.transactionId !== args.where.id);
    return record as never;
  });
});

describe('bank statement posting', () => {
  it('retains rows without a bank reference and deduplicates repeat imports', async () => {
    const input = {
      xml: xml().replace('<fitid>bank-1</fitid>', ''),
      rememberMatchedAccounts: false,
    };
    expect((await importBankStatementXml(input)).imported).toBe(1);
    expect(rows[0]?.sourceId).toContain(':xml:');
    expect((await importBankStatementXml(input)).duplicateSkipped).toBe(1);
    expect(rows).toHaveLength(1);
  });
  it('does not confuse equal bank references from different own accounts', async () => {
    await importBankStatementXml({ xml: xml(), rememberMatchedAccounts: false });
    expect(
      (
        await importBankStatementXml({
          xml: xml().replace('160-555-01', '160-777-01'),
          rememberMatchedAccounts: false,
        })
      ).imported,
    ).toBe(1);
    expect(rows).toHaveLength(2);
  });
  it('does not silently normalize an invalid calendar date', async () => {
    const result = await importBankStatementXml({
      xml: xml().replace('2026-10-10', '2026-02-30'),
      rememberMatchedAccounts: false,
    });
    expect(result).toMatchObject({ imported: 0, invalidSkipped: 1 });
    expect(rows).toHaveLength(0);
  });
  it('posts a supplier payment, allocates it, and marks the bill paid on the bank date', async () => {
    const result = await importBankStatementXml({ xml: xml(), rememberMatchedAccounts: false });
    expect(result).toMatchObject({
      imported: 1,
      allocated: 1,
      unallocated: 0,
      matchedSuppliers: 1,
    });
    expect(result.transactions[0]).toMatchObject({
      supplierId: supplier.id,
      status: 'SETTLED',
      allocatedAmount: 100,
      unallocatedAmount: 0,
    });
    expect(allocations[0]).toMatchObject({
      targetType: 'COMPANY_EXPENSE',
      targetId: expense.id,
      amount: 100,
    });
    expect(prisma.companyExpense.updateMany).toHaveBeenCalledWith({
      where: { id: expense.id },
      data: { paidAt: date },
    });
    expect(prisma.companyExpense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          paidAt: null,
          issuedAt: { lte: date },
          OR: expect.arrayContaining([{ supplierId: supplier.id }]),
        }),
      }),
    );
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: 'Serializable' }),
    );
  });
  it('connects customer receipts and closes the outgoing invoice', async () => {
    const result = await importBankStatementXml({
      xml: xml({ benefit: 'credit', name: 'Customer DOO', reference: '123/26' }),
      rememberMatchedAccounts: false,
    });
    expect(result.transactions[0]).toMatchObject({
      partnerId: partner.id,
      type: 'INCOME',
      unallocatedAmount: 0,
    });
    expect(allocations[0]).toMatchObject({
      targetType: 'TRIP_INVOICE',
      targetId: trip.id,
      amount: 100,
    });
    expect(prisma.trip.updateMany).toHaveBeenCalledWith({
      where: { id: trip.id },
      data: { paidAt: date },
    });
  });
  it('closes all rows of a monthly series invoice together', async () => {
    vi.mocked(prisma.trip.findMany).mockResolvedValue([
      { ...trip, invoiceGroupId: 'group-1', invoiceGrossAmount: 40 },
      { ...trip, id: 'trip-2', invoiceGroupId: 'group-1', invoiceGrossAmount: 60 },
    ] as never);
    vi.mocked(prisma.trip.count).mockResolvedValue(2);
    const result = await importBankStatementXml({
      xml: xml({ benefit: 'credit' }),
      rememberMatchedAccounts: false,
    });
    expect(result.unallocated).toBe(0);
    expect(allocations[0]).toMatchObject({
      targetType: 'TRIP_SERIES_INVOICE',
      targetId: 'group-1',
      amount: 100,
    });
    expect(prisma.trip.updateMany).toHaveBeenCalledWith({
      where: { invoiceGroupId: 'group-1' },
      data: { paidAt: date },
    });
  });
  it('leaves a partially paid bill open and retains overpayments in the payment record', async () => {
    const partial = await importBankStatementXml({
      xml: xml({ amount: 40 }),
      rememberMatchedAccounts: false,
    });
    expect(partial.transactions[0]).toMatchObject({ allocatedAmount: 40, unallocatedAmount: 0 });
    expect(prisma.companyExpense.updateMany).toHaveBeenLastCalledWith({
      where: { id: expense.id },
      data: { paidAt: null },
    });
  });
  it('retains the unallocated balance of an overpayment', async () => {
    const result = await importBankStatementXml({
      xml: xml({ amount: 140 }),
      rememberMatchedAccounts: false,
    });
    expect(result).toMatchObject({ allocated: 1, unallocated: 1 });
    expect(result.transactions[0]).toMatchObject({ allocatedAmount: 100, unallocatedAmount: 40 });
  });
  it('keeps unknown counterparties as paid, unallocated transactions', async () => {
    vi.mocked(findSupplierByBankAccount).mockResolvedValue(null);
    vi.mocked(findSupplierIdByName).mockResolvedValue(null);
    const result = await importBankStatementXml({
      xml: xml({ name: 'Unknown supplier' }),
      rememberMatchedAccounts: false,
    });
    expect(result.transactions[0]).toMatchObject({
      supplierId: null,
      supplier: 'Unknown supplier',
      status: 'SETTLED',
      unallocatedAmount: 100,
    });
    expect(result.unallocated).toBe(1);
    expect(prisma.paymentAllocation.upsert).not.toHaveBeenCalled();
  });
  it('does not allocate an unknown reference to an unrelated bill', async () => {
    const result = await importBankStatementXml({
      xml: xml({ reference: 'other-invoice' }),
      rememberMatchedAccounts: false,
    });
    expect(result.transactions[0]).toMatchObject({
      supplierId: supplier.id,
      unallocatedAmount: 100,
    });
    expect(prisma.paymentAllocation.upsert).not.toHaveBeenCalled();
  });
  it('reimport does not duplicate payments or allocations', async () => {
    const input = { xml: xml(), rememberMatchedAccounts: false };
    await importBankStatementXml(input);
    const repeat = await importBankStatementXml(input);
    expect(repeat).toMatchObject({ imported: 0, duplicateSkipped: 1, unallocated: 0 });
    expect(rows).toHaveLength(1);
    expect(allocations).toHaveLength(1);
  });
  it('reimport repairs previously unmatched entries without another cash movement', async () => {
    vi.mocked(findSupplierByBankAccount).mockResolvedValueOnce(null);
    vi.mocked(findSupplierIdByName).mockResolvedValueOnce(null);
    await importBankStatementXml({ xml: xml(), rememberMatchedAccounts: false });
    const result = await importBankStatementXml({ xml: xml(), rememberMatchedAccounts: false });
    expect(result).toMatchObject({ imported: 0, duplicateSkipped: 1, unallocated: 0 });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.supplierId).toBe(supplier.id);
    expect(allocations).toHaveLength(1);
  });
  it('manual allocation links the payment back to the supplier ledger', async () => {
    vi.mocked(findSupplierByBankAccount).mockResolvedValueOnce(null);
    vi.mocked(findSupplierIdByName).mockResolvedValueOnce(null);
    await importBankStatementXml({ xml: xml(), rememberMatchedAccounts: false });
    const result = await createPaymentAllocation(rows[0]!.id, {
      targetType: 'COMPANY_EXPENSE',
      targetId: expense.id,
      amount: 100,
      note: null,
    });
    expect(result.transaction).toMatchObject({ supplierId: supplier.id, unallocatedAmount: 0 });
  });
  it('rejects linking a payment to a different supplier', async () => {
    await importBankStatementXml({
      xml: xml({ reference: 'unmatched' }),
      rememberMatchedAccounts: false,
    });
    vi.mocked(prisma.companyExpense.findUnique).mockResolvedValue({
      ...expense,
      supplierId: 'different-supplier',
    } as never);
    await expect(
      createPaymentAllocation(rows[0]!.id, {
        targetType: 'COMPANY_EXPENSE',
        targetId: expense.id,
        amount: 100,
        note: null,
      }),
    ).rejects.toThrow('drugom dobavljaču');
    expect(allocations).toHaveLength(0);
  });
  it('does not allocate more than the remaining payment', async () => {
    await importBankStatementXml({
      xml: xml({ amount: 40, reference: 'unmatched' }),
      rememberMatchedAccounts: false,
    });
    await expect(
      createPaymentAllocation(rows[0]!.id, {
        targetType: 'COMPANY_EXPENSE',
        targetId: expense.id,
        amount: 50,
        note: null,
      }),
    ).rejects.toThrow('nerasknjiženog dela');
    expect(allocations).toHaveLength(0);
  });
  it('does not pay an invoice already marked paid outside allocation', async () => {
    await importBankStatementXml({
      xml: xml({ reference: 'unmatched' }),
      rememberMatchedAccounts: false,
    });
    vi.mocked(prisma.companyExpense.findUnique).mockResolvedValue({
      ...expense,
      paidAt: date,
    } as never);
    await expect(
      createPaymentAllocation(rows[0]!.id, {
        targetType: 'COMPANY_EXPENSE',
        targetId: expense.id,
        amount: 100,
        note: null,
      }),
    ).rejects.toThrow('već označen kao plaćen');
    expect(allocations).toHaveLength(0);
  });
  it('adds successive manual allocations without replacing the previously posted amount', async () => {
    await importBankStatementXml({
      xml: xml({ reference: 'unmatched' }),
      rememberMatchedAccounts: false,
    });
    const input = {
      targetType: 'COMPANY_EXPENSE' as const,
      targetId: expense.id,
      amount: 30,
      note: null,
    };
    const first = await createPaymentAllocation(rows[0]!.id, input);
    expect(first.transaction.unallocatedAmount).toBe(70);
    const second = await createPaymentAllocation(rows[0]!.id, { ...input, amount: 70 });
    expect(second.transaction).toMatchObject({
      allocatedAmount: 100,
      unallocatedAmount: 0,
      allocationCount: 1,
    });
    expect(allocations).toHaveLength(1);
    expect(prisma.companyExpense.updateMany).toHaveBeenLastCalledWith({
      where: { id: expense.id },
      data: { paidAt: date },
    });
  });
  it('preserves bank identity on edit and rejects changing allocated amounts', async () => {
    await importBankStatementXml({ xml: xml(), rememberMatchedAccounts: false });
    const input = bankStatementEntryWriteSchema.parse({
      type: 'EXPENSE',
      category: 'OTHER',
      amount: 100,
      occurredAt: '2026-10-10',
      supplier: supplier.name,
      note: 'Edited',
    });
    expect(await updateBankStatementEntry(rows[0]!.id, input)).toMatchObject({
      sourceId: 'bank:160000000000055501:bank-1',
      note: 'Edited',
    });
    await expect(updateBankStatementEntry(rows[0]!.id, { ...input, amount: 90 })).rejects.toThrow(
      'Rasknjiženoj stavci',
    );
  });
  it('reopens a bill after the corresponding statement payment is deleted', async () => {
    await importBankStatementXml({ xml: xml(), rememberMatchedAccounts: false });
    await deleteTransaction(rows[0]!.id);
    expect(allocations).toHaveLength(0);
    expect(prisma.companyExpense.updateMany).toHaveBeenLastCalledWith({
      where: { id: expense.id },
      data: { paidAt: null },
    });
  });
  it('filters unresolved balances before pagination, including partially allocated payments', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { id: 'partial-payment' },
      { id: 'unknown-payment' },
    ]);
    vi.mocked(prisma.financeTransaction.count).mockResolvedValue(2);
    vi.mocked(prisma.financeTransaction.findMany).mockResolvedValue([]);
    const result = await listTransactions(
      listTransactionsQuerySchema.parse({ unallocatedOnly: 'true', page: 2, limit: 1 }),
    );
    expect(result.pagination.total).toBe(2);
    expect(prisma.financeTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ['partial-payment', 'unknown-payment'] } }),
        skip: 1,
        take: 1,
      }),
    );
    expect(listTransactionsQuerySchema.parse({ unallocatedOnly: 'false' }).unallocatedOnly).toBe(
      false,
    );
  });
});
