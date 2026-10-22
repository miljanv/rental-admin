import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../config/prisma', () => ({
  prisma: { openingBalance: { findFirst: vi.fn() }, paymentAllocation: { count: vi.fn() } },
}));
import { prisma } from '../config/prisma';
import { assertAfterOpeningCutover } from './opening-cutover';
import { assertDocumentHasNoAllocations } from './settled-document';
beforeEach(() => vi.resetAllMocks());
describe('opening cutover and linked document guards', () => {
  it('rejects recording a document covered by an opening balance', async () => {
    vi.mocked(prisma.openingBalance.findFirst).mockResolvedValue({ id: 'opening-1' } as never);
    await expect(
      assertAfterOpeningCutover(prisma, { supplierId: 's-1', occurredAt: new Date('2026-01-01') }),
    ).rejects.toThrow('početnim stanjem');
    expect(prisma.openingBalance.findFirst).toHaveBeenCalledWith({
      where: {
        status: 'CONFIRMED',
        asOfDate: { gte: new Date('2026-01-01') },
        OR: [{ supplierId: 's-1' }],
      },
    });
  });
  it('allows subsequent payments and keeps cash outside official opening balances', async () => {
    vi.mocked(prisma.openingBalance.findFirst).mockResolvedValue(null);
    await expect(
      assertAfterOpeningCutover(prisma, { supplierId: 's-1', occurredAt: new Date('2026-01-05') }),
    ).resolves.toBeUndefined();
    vi.mocked(prisma.openingBalance.findFirst).mockClear();
    await assertAfterOpeningCutover(prisma, {
      supplierId: 's-1',
      occurredAt: new Date(),
      paymentMethod: 'CASH',
    });
    expect(prisma.openingBalance.findFirst).not.toHaveBeenCalled();
  });
  it('requires undoing allocations before a linked document can be modified or deleted', async () => {
    vi.mocked(prisma.paymentAllocation.count).mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    await expect(
      assertDocumentHasNoAllocations([{ targetType: 'COMPANY_EXPENSE', targetId: 'bill-1' }]),
    ).rejects.toThrow('poništite povezivanja');
    await expect(
      assertDocumentHasNoAllocations([{ targetType: 'COMPANY_EXPENSE', targetId: 'bill-1' }]),
    ).resolves.toBeUndefined();
  });
});
