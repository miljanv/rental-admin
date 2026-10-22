import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bankStatementEntryWriteSchema,
  listSettlementTargetsQuerySchema,
  listTransactionsQuerySchema,
} from '@rental-admin/shared';

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
      openingBalance: model(),
      financeAuditEvent: model(),
      paymentAllocation: model(),
      partner: model(),
      partnerBankAccount: model(),
      supplier: model(),
      supplierBankAccount: model(),
      companyExpense: model(),
      fuelLog: model(),
      vehicleMaintenance: model(),
      trip: model(),
    },
  };
});
// Services read the organization of the current request; unit tests have none.
vi.mock('../utils/tenant-context', () => ({
  requireOrganizationId: () => 'org-test',
  getTenantContext: () => ({ userId: 'user-test' }),
}));
vi.mock('./supplier.service', () => ({
  findSupplierByBankAccount: vi.fn(),
  findSupplierIdByName: vi.fn(),
  rememberSupplierBankAccount: vi.fn(),
}));

import { prisma } from '../config/prisma';
import {
  linkPaymentCounterparty,
  previewPaymentAllocation,
  confirmPaymentAllocation,
  reversePaymentAllocation,
} from './payment-settlement.service';
import {
  saveOpeningBalance,
  confirmOpeningBalance,
  reverseOpeningBalance,
  openingLedgerEntries,
} from './opening-balance.service';
import type { FinanceTransactionRecord } from '../utils/transaction-mapper';
import { findSupplierByBankAccount, findSupplierIdByName } from './supplier.service';
import {
  createPaymentAllocation,
  createTransaction,
  deleteTransaction,
  getFinanceReport,
  getVatReport,
  importBankStatementXml,
  listSettlementTargets,
  listTransactions,
  previewBankStatementXml,
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
  supplyDate: new Date('2026-10-01'),
  paidAt: null,
  paymentMethod: 'ACCOUNT',
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
  invoiceSupplyDate: new Date('2026-10-01'),
  paidAt: null,
  referenceNumber: '123/26',
  departureDate: new Date('2026-10-01'),
  origin: 'A',
  destination: 'B',
  invoiceDescription: null,
  paymentMethod: 'ACCOUNT',
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
  vi.mocked(prisma.openingBalance.findMany).mockResolvedValue([]);
  rows = [];
  allocations = [];
  vi.mocked(prisma.$transaction).mockImplementation((callback) => {
    if (typeof callback !== 'function') throw new Error('Expected transaction callback');
    return callback(prisma);
  });
  vi.mocked(findSupplierByBankAccount).mockResolvedValue(supplier);
  vi.mocked(findSupplierIdByName).mockResolvedValue(supplier.id);
  vi.mocked(prisma.partnerBankAccount.findFirst).mockResolvedValue({ partner } as never);
  vi.mocked(prisma.supplier.findUnique).mockResolvedValue(supplier as never);
  vi.mocked(prisma.partner.findUnique).mockResolvedValue(partner as never);
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
  it('recommends and limits open bills to the supplier recognized on the payment', async () => {
    vi.mocked(prisma.financeTransaction.findUnique).mockResolvedValueOnce({
      type: 'EXPENSE',
      supplierId: supplier.id,
      supplier: supplier.name,
      partnerId: null,
      partner: null,
    } as never);
    vi.mocked(prisma.companyExpense.findMany).mockResolvedValueOnce([
      {
        ...expense,
        id: 'other-bill',
        supplierId: 'other-supplier',
        supplier: 'Other Supplier',
        description: 'Other bill',
        createdAt: date,
      },
      { ...expense, description: 'Phone bill', createdAt: date },
    ] as never);

    const result = await listSettlementTargets(
      listSettlementTargetsQuerySchema.parse({
        transactionId: 'payment-1',
        search: 'Supplier',
      }),
    );

    expect(prisma.companyExpense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            {
              OR: [
                { supplierId: supplier.id },
                {
                  supplierId: null,
                  supplier: { equals: supplier.name, mode: 'insensitive' },
                },
              ],
            },
          ],
        }),
      }),
    );
    expect(result.targets[0]).toMatchObject({
      targetId: expense.id,
      counterparty: supplier.name,
      recommended: true,
    });
  });

  it('previews account and invoice matches without writing financial data', async () => {
    const result = await previewBankStatementXml({ xml: xml(), rememberMatchedAccounts: true });

    expect(result.summary).toMatchObject({ total: 1, ready: 1, unallocated: 0 });
    expect(result.rows[0]).toMatchObject({
      status: 'READY',
      matchMethod: 'BANK_ACCOUNT',
      counterpartyId: supplier.id,
      allocatedAmount: 100,
      unallocatedAmount: 0,
    });
    expect(result.rows[0]?.allocations[0]).toMatchObject({
      targetType: 'COMPANY_EXPENSE',
      targetId: expense.id,
      amount: 100,
    });
    expect(prisma.financeTransaction.create).not.toHaveBeenCalled();
    expect(prisma.paymentAllocation.upsert).not.toHaveBeenCalled();
  });

  it('shows an unmatched reference as unallocated before import', async () => {
    const result = await previewBankStatementXml({
      xml: xml({ reference: 'wrong-reference' }),
      rememberMatchedAccounts: true,
    });

    expect(result.summary).toMatchObject({ total: 1, ready: 0, unallocated: 1 });
    expect(result.rows[0]).toMatchObject({
      status: 'UNALLOCATED',
      matchMethod: 'BANK_ACCOUNT',
      allocatedAmount: 0,
      unallocatedAmount: 100,
    });
  });

  it('previews multiple rows without a transaction, double allocation, or duplicate payments', async () => {
    const secondRow = xml({ amount: 60, fitId: 'bank-2' }).match(
      /<stmttrn>[\s\S]*?<\/stmttrn>/,
    )![0];
    const result = await previewBankStatementXml({
      xml: xml({ amount: 60 }).replace('</statement>', `${secondRow}${secondRow}</statement>`),
      rememberMatchedAccounts: true,
    });

    expect(result.summary).toMatchObject({ total: 3, ready: 1, partial: 1, duplicates: 1 });
    expect(
      result.rows.map((row) => [row.status, row.allocatedAmount, row.unallocatedAmount]),
    ).toEqual([
      ['READY', 60, 0],
      ['PARTIAL', 40, 20],
      ['DUPLICATE', 0, 0],
    ]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(rows).toHaveLength(0);
    expect(allocations).toHaveLength(0);
    expect(prisma.companyExpense.updateMany).not.toHaveBeenCalled();
    expect(prisma.trip.updateMany).not.toHaveBeenCalled();
  });

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

describe('finance report invoice recognition', () => {
  it('shows old entered invoices by issue month and does not count their bank payment twice', async () => {
    vi.mocked(prisma.financeTransaction.findMany).mockResolvedValue([
      {
        type: 'EXPENSE',
        category: 'OTHER',
        amount: 100,
        occurredAt: new Date('2026-10-10'),
        paymentMethod: 'ACCOUNT',
        supplier: supplier.name,
        supplierId: supplier.id,
        partner: null,
        partnerId: null,
        partnerRef: null,
        route: null,
        vehicle: null,
        paymentAllocations: [{ targetType: 'COMPANY_EXPENSE', amount: 100 }],
      },
      {
        type: 'EXPENSE',
        category: 'BANK',
        amount: 20,
        occurredAt: new Date('2026-10-10'),
        paymentMethod: 'ACCOUNT',
        supplier: 'Banka',
        supplierId: null,
        partner: null,
        partnerId: null,
        partnerRef: null,
        route: null,
        vehicle: null,
        paymentAllocations: [],
      },
    ] as never);
    vi.mocked(prisma.companyExpense.findMany).mockResolvedValue([
      {
        ...expense,
        description: 'Prevoz grupe',
        scope: 'SUBCONTRACTOR',
        paymentMethod: 'ACCOUNT',
        vehicle: null,
        issuedAt: new Date('2026-05-15'),
      },
      {
        ...expense,
        id: 'bill-2',
        amountWithVat: 30,
        description: 'Održavanje računa',
        scope: 'BANK',
        paymentMethod: 'ACCOUNT',
        vehicle: null,
        issuedAt: new Date('2026-06-15'),
      },
    ] as never);
    vi.mocked(prisma.partner.findMany).mockResolvedValue([]);
    vi.mocked(prisma.supplier.findMany).mockResolvedValue([supplier] as never);

    const report = await getFinanceReport({
      from: '2026-05-01',
      to: '2026-10-10',
      paymentMethod: 'ACCOUNT',
    });

    expect(report.totals.expense).toBe(150);
    expect(report.monthly.find((month) => month.month === 5)?.expense).toBe(100);
    expect(report.monthly.find((month) => month.month === 6)?.expense).toBe(30);
    expect(report.monthly.find((month) => month.month === 10)?.expense).toBe(20);
    expect(report.byCategory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'SUBCONTRACTOR', expense: 100 }),
        expect.objectContaining({ category: 'BANK', expense: 50 }),
      ]),
    );
  });
});

describe('tenant isolation of transaction references', () => {
  const manualInput = {
    type: 'INCOME',
    category: 'OTHER',
    amount: 100,
    occurredAt: '2026-10-10',
    paymentMethod: 'ACCOUNT',
    vehicleId: null,
    driverId: null,
    partnerId: 'foreign-partner',
    contractId: null,
  } as never;

  it('rejects a partner that the caller organization does not own', async () => {
    // The lookup is tenant-scoped, so another organization's partner id finds nothing.
    vi.mocked(prisma.partner.findUnique).mockResolvedValue(null);

    await expect(createTransaction(manualInput)).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.financeTransaction.create).not.toHaveBeenCalled();
  });
});

describe('VAT report', () => {
  it('groups VAT by supply date and identifies historical rows without one', async () => {
    vi.mocked(prisma.companyExpense.findMany).mockResolvedValue([
      {
        issuedAt: new Date('2026-10-05'),
        supplyDate: new Date('2026-09-30'),
        vatAmount: 200,
      },
      {
        issuedAt: new Date('2026-09-28'),
        supplyDate: null,
        vatAmount: 100,
      },
    ] as never);
    vi.mocked(prisma.trip.findMany).mockResolvedValue([
      {
        invoicedAt: new Date('2026-10-05'),
        invoiceSupplyDate: new Date('2026-09-30'),
        invoiceVatAmount: 300,
      },
      {
        invoicedAt: new Date('2026-09-26'),
        invoiceSupplyDate: null,
        invoiceVatAmount: 50,
      },
    ] as never);

    const report = await getVatReport({ from: '2026-09-01', to: '2026-10-31' });

    expect(report.monthly.find((month) => month.month === 9)).toMatchObject({
      inputVat: 300,
      outputVat: 350,
      balance: 50,
    });
    expect(report.monthly.find((month) => month.month === 10)).toMatchObject({
      inputVat: 0,
      outputVat: 0,
      balance: 0,
    });
    expect(report.legacyInputCount).toBe(1);
    expect(report.legacyOutputCount).toBe(1);
  });
});

describe('confirmed allocation plans', () => {
  it('allocates 2000 across 1000, 500 and 800, leaving 300 on the third invoice', async () => {
    const bills = [1000, 500, 800].map((amountWithVat, index) => ({
      ...expense,
      id: `bill-${index}`,
      amountWithVat,
      issuedAt: new Date(`2026-10-0${index + 1}`),
    }));
    vi.mocked(prisma.companyExpense.findMany).mockResolvedValue(bills as never);
    vi.mocked(prisma.companyExpense.findUnique).mockImplementation(
      (args) => bills.find((row) => row.id === args.where.id) as never,
    );
    const result = await importBankStatementXml({
      xml: xml({ amount: 2000, reference: 'not-an-invoice' }),
      rememberMatchedAccounts: false,
    });
    const id = result.transactions[0]!.id;
    expect((await previewPaymentAllocation(id, { ignoreReference: false })).allocations).toEqual(
      [],
    );
    const plan = await previewPaymentAllocation(id, { ignoreReference: true });
    expect(plan.allocations.map((row) => row.amount)).toEqual([1000, 500, 500]);
    const updated = await confirmPaymentAllocation(id, {
      ignoreReference: true,
      token: plan.token,
    });
    expect(updated).toMatchObject({
      allocatedAmount: 2000,
      unallocatedAmount: 0,
      allocationCount: 3,
    });
    expect(prisma.companyExpense.updateMany).toHaveBeenLastCalledWith({
      where: { id: 'bill-2' },
      data: { paidAt: null },
    });
    await expect(
      confirmPaymentAllocation(id, { ignoreReference: true, token: plan.token }),
    ).rejects.toThrow('promenjeni');
    expect(allocations).toHaveLength(3);
  });

  it('preserves a surplus and refuses a plan when another payment changed the balance', async () => {
    const result = await importBankStatementXml({
      xml: xml({ amount: 150, reference: 'unknown' }),
      rememberMatchedAccounts: false,
    });
    const id = result.transactions[0]!.id;
    const plan = await previewPaymentAllocation(id, { ignoreReference: true });
    expect(plan).toMatchObject({ allocatedAmount: 100, remainingAmount: 50 });
    rows[0]!.amount = 80;
    await expect(
      confirmPaymentAllocation(id, { ignoreReference: true, token: plan.token }),
    ).rejects.toThrow('promenjeni');
    expect(allocations).toHaveLength(0);
  });

  it('links a payment to its party without allocating or changing its amount', async () => {
    const result = await importBankStatementXml({
      xml: xml({ reference: 'unknown' }),
      rememberMatchedAccounts: false,
    });
    const updated = await linkPaymentCounterparty(result.transactions[0]!.id, {
      partyType: 'SUPPLIER',
      partyId: supplier.id,
      rememberAccount: false,
    });
    expect(updated).toMatchObject({ amount: 100, supplierId: supplier.id, unallocatedAmount: 100 });
    expect(allocations).toHaveLength(0);
    expect(rows).toHaveLength(1);
  });

  it('rejects an inaccessible party and a bank account owned by another supplier', async () => {
    const result = await importBankStatementXml({
      xml: xml({ reference: 'unknown' }),
      rememberMatchedAccounts: false,
    });
    const id = result.transactions[0]!.id;
    vi.mocked(prisma.supplier.findUnique).mockResolvedValueOnce(null);
    await expect(
      linkPaymentCounterparty(id, {
        partyType: 'SUPPLIER',
        partyId: 'foreign-tenant-id',
        rememberAccount: false,
      }),
    ).rejects.toThrow('nije pronađen');
    vi.mocked(prisma.supplierBankAccount.findMany).mockResolvedValue([
      { supplierId: 'other', accountNumber: '160-12345-67' },
    ] as never);
    await expect(
      linkPaymentCounterparty(id, {
        partyType: 'SUPPLIER',
        partyId: supplier.id,
        rememberAccount: true,
      }),
    ).rejects.toThrow('drugim dobavljačem');
  });

  it('undoes a link, reopens the invoice and keeps the payment and audit record', async () => {
    const imported = await importBankStatementXml({ xml: xml(), rememberMatchedAccounts: false });
    const allocation = allocations[0]!;
    vi.mocked(prisma.paymentAllocation.findFirst).mockResolvedValueOnce(allocation as never);
    vi.mocked(prisma.paymentAllocation.delete).mockImplementation(() => {
      allocations = [];
      return allocation as never;
    });
    const updated = await reversePaymentAllocation(
      imported.transactions[0]!.id,
      allocation.id,
      'Pogrešan račun',
    );
    expect(updated).toMatchObject({ amount: 100, unallocatedAmount: 100, allocationCount: 0 });
    expect(rows).toHaveLength(1);
    expect(prisma.companyExpense.updateMany).toHaveBeenLastCalledWith({
      where: { id: expense.id },
      data: { paidAt: null },
    });
    expect(prisma.financeAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ALLOCATION_REVERSED', reason: 'Pogrešan račun' }),
      }),
    );
  });
});

const openingRecord = {
  id: 'opening-1',
  organizationId: 'org-test',
  partnerId: null,
  supplierId: 'supplier-1',
  kind: 'DEBT',
  amount: 100,
  asOfDate: new Date('2026-01-01'),
  status: 'DRAFT',
  note: null,
};
describe('opening balances', () => {
  it('blocks linking an older bank payment to an invoice after confirming its opening balance', async () => {
    const imported = await importBankStatementXml({
      xml: xml({ reference: 'unknown' }),
      rememberMatchedAccounts: false,
    });
    vi.mocked(prisma.openingBalance.findFirst).mockResolvedValue({
      ...openingRecord,
      status: 'CONFIRMED',
    } as never);
    await expect(
      createPaymentAllocation(imported.transactions[0]!.id, {
        targetType: 'COMPANY_EXPENSE',
        targetId: expense.id,
        amount: 100,
        note: null,
      }),
    ).rejects.toThrow('početnim stanjem');
    expect(allocations).toHaveLength(0);
  });

  it('allows the opening credit itself to settle a later invoice', async () => {
    const imported = await importBankStatementXml({
      xml: xml({ reference: 'unknown' }),
      rememberMatchedAccounts: false,
    });
    rows[0]!.sourceType = 'OPENING_BALANCE';
    vi.mocked(prisma.openingBalance.findFirst).mockResolvedValue({
      ...openingRecord,
      status: 'CONFIRMED',
      kind: 'CREDIT',
    } as never);
    const result = await createPaymentAllocation(imported.transactions[0]!.id, {
      targetType: 'COMPANY_EXPENSE',
      targetId: expense.id,
      amount: 100,
      note: null,
    });
    expect(result.transaction.unallocatedAmount).toBe(0);
    expect(allocations).toHaveLength(1);
  });

  it('saves a draft without creating a payment and refuses edits after confirmation', async () => {
    vi.mocked(prisma.openingBalance.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.openingBalance.create).mockResolvedValue(openingRecord as never);
    const input = {
      partyType: 'SUPPLIER' as const,
      partyId: supplier.id,
      kind: 'DEBT' as const,
      amount: 100,
      asOfDate: '2026-01-01',
      note: '',
    };
    await saveOpeningBalance(input);
    expect(prisma.financeTransaction.create).not.toHaveBeenCalled();
    vi.mocked(prisma.openingBalance.findUnique).mockResolvedValue({
      ...openingRecord,
      status: 'CONFIRMED',
    } as never);
    await expect(saveOpeningBalance(input, openingRecord.id)).rejects.toThrow('Potvrđeno stanje');
  });

  it('rejects a second active opening and overlapping already recorded balances', async () => {
    vi.mocked(prisma.openingBalance.findFirst).mockResolvedValue(openingRecord as never);
    await expect(
      saveOpeningBalance({
        partyType: 'SUPPLIER',
        partyId: supplier.id,
        kind: 'DEBT',
        amount: 100,
        asOfDate: '2026-01-01',
        note: '',
      }),
    ).rejects.toThrow('već postoji');
    vi.mocked(prisma.openingBalance.findUnique).mockResolvedValue(openingRecord as never);
    vi.mocked(prisma.financeTransaction.count).mockResolvedValue(1);
    await expect(confirmOpeningBalance(openingRecord.id)).rejects.toThrow('već postoje');
    expect(prisma.openingBalance.update).not.toHaveBeenCalled();
  });

  it('creates a separately classified credit, not a new bank payment', async () => {
    vi.mocked(prisma.openingBalance.findUnique).mockResolvedValue({
      ...openingRecord,
      kind: 'CREDIT',
    } as never);
    vi.mocked(prisma.financeTransaction.count).mockResolvedValue(0);
    vi.mocked(prisma.companyExpense.count).mockResolvedValue(0);
    await confirmOpeningBalance(openingRecord.id);
    expect(rows[0]).toMatchObject({
      sourceType: 'OPENING_BALANCE',
      sourceId: openingRecord.id,
      amount: 100,
    });
    expect(prisma.openingBalance.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CONFIRMED' }) }),
    );
  });

  it('rejects an opening balance overlapping old fuel or maintenance costs', async () => {
    vi.mocked(prisma.openingBalance.findUnique).mockResolvedValue(openingRecord as never);
    vi.mocked(prisma.financeTransaction.count).mockResolvedValue(0);
    vi.mocked(prisma.companyExpense.count).mockResolvedValue(0);
    for (const [fuel, maintenance] of [
      [1, 0],
      [0, 1],
    ]) {
      vi.mocked(prisma.fuelLog.count).mockResolvedValue(fuel!);
      vi.mocked(prisma.vehicleMaintenance.count).mockResolvedValue(maintenance!);
      await expect(confirmOpeningBalance(openingRecord.id)).rejects.toThrow('već postoje');
    }
    expect(prisma.openingBalance.update).not.toHaveBeenCalled();
  });

  it('includes confirmed initial debt in automatic oldest-first allocation', async () => {
    const opening = { ...openingRecord, status: 'CONFIRMED', supplier };
    vi.mocked(prisma.openingBalance.findMany).mockResolvedValue([opening] as never);
    vi.mocked(prisma.openingBalance.findUnique).mockResolvedValue(opening as never);
    const preview = await previewBankStatementXml({
      xml: xml({ amount: 150 }),
      rememberMatchedAccounts: false,
    });
    expect(preview.rows[0]!.allocations.map((row) => [row.targetType, row.amount])).toEqual([
      ['OPENING_BALANCE', 100],
      ['COMPANY_EXPENSE', 50],
    ]);
  });

  it('blocks reversal of an allocated initial balance and preserves reversal history', async () => {
    vi.mocked(prisma.openingBalance.findUnique).mockResolvedValue({
      ...openingRecord,
      status: 'CONFIRMED',
    } as never);
    vi.mocked(prisma.financeTransaction.findMany).mockResolvedValue([]);
    vi.mocked(prisma.paymentAllocation.count).mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    await expect(reverseOpeningBalance(openingRecord.id, 'Pogrešan iznos')).rejects.toThrow(
      'Prvo poništite',
    );
    await reverseOpeningBalance(openingRecord.id, 'Pogrešan iznos');
    expect(prisma.openingBalance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'REVERSED',
          activeKey: null,
          reversalReason: 'Pogrešan iznos',
        }),
      }),
    );
    vi.mocked(prisma.openingBalance.findMany).mockResolvedValue([
      { ...openingRecord, status: 'REVERSED', reversalReason: 'Pogrešan iznos' },
    ] as never);
    const entries = await openingLedgerEntries({ partyType: 'SUPPLIER', partyId: supplier.id });
    expect(entries).toHaveLength(2);
    expect(entries.reduce((sum, row) => sum + row.debit - row.credit, 0)).toBe(0);
  });
});
