import type {
  DeleteVatReturnResult,
  VatReturnDto,
  VatReturnKind,
  VatReturnWriteRequest,
} from '@rental-admin/shared';

import { prisma, type TransactionClient } from '../config/prisma';
import { conflict, notFound } from '../utils/app-error';
import { logger } from '../utils/logger';
import { requireOrganizationId } from '../utils/tenant-context';

const MONEY_EPSILON = 0.005;

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const parseDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

interface VatReturnRecord {
  id: string;
  year: number;
  month: number;
  kind: VatReturnKind;
  amount: number;
  documentNumber: string | null;
  filedAt: Date | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const vatReturnMonthKey = (year: number, month: number): string =>
  `${year}-${String(month).padStart(2, '0')}`;

/** "PDV 09/2026 · 123" — shown wherever a VAT payment is linked. */
export const vatReturnLabel = (record: {
  year: number;
  month: number;
  documentNumber: string | null;
}): string =>
  [`PDV ${String(record.month).padStart(2, '0')}/${record.year}`, record.documentNumber]
    .filter(Boolean)
    .join(' · ');

/** Last day of the return's month: the reference date when no filing date was entered. */
export const vatReturnPeriodEnd = (record: { year: number; month: number }): Date =>
  new Date(Date.UTC(record.year, record.month, 0));

export const settledByVatReturn = async (
  ids: string[],
  tx: TransactionClient = prisma,
): Promise<Map<string, number>> => {
  if (ids.length === 0) {
    return new Map();
  }

  const rows = await tx.paymentAllocation.groupBy({
    by: ['targetId'],
    where: { targetType: 'VAT_RETURN', targetId: { in: ids } },
    _sum: { amount: true },
  });

  return new Map(rows.map((row) => [row.targetId, row._sum.amount ?? 0]));
};

export const toVatReturnDto = (record: VatReturnRecord, settled: number): VatReturnDto => {
  const settledAmount = roundMoney(settled);

  return {
    id: record.id,
    year: record.year,
    month: record.month,
    kind: record.kind,
    amount: record.amount,
    documentNumber: record.documentNumber,
    filedAt: record.filedAt ? toIsoDate(record.filedAt) : null,
    note: record.note,
    settledAmount,
    openAmount: Math.max(0, roundMoney(record.amount - settledAmount)),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
};

/** Returns filed for the months between `from` and `to`, keyed by `YYYY-MM`. */
export const listVatReturnsByMonth = async (
  from: string,
  to: string,
): Promise<Map<string, VatReturnDto>> => {
  const fromKey = from.slice(0, 7);
  const toKey = to.slice(0, 7);
  const firstYear = Number(from.slice(0, 4));
  const lastYear = Number(to.slice(0, 4));
  const records = await prisma.vatReturn.findMany({
    where: { year: { gte: firstYear, lte: lastYear } },
  });
  const inRange = records.filter((record) => {
    const key = vatReturnMonthKey(record.year, record.month);
    return key >= fromKey && key <= toKey;
  });
  const settled = await settledByVatReturn(inRange.map((record) => record.id));

  return new Map(
    inRange.map((record) => [
      vatReturnMonthKey(record.year, record.month),
      toVatReturnDto(record, settled.get(record.id) ?? 0),
    ]),
  );
};

const getVatReturnRecord = async (id: string): Promise<VatReturnRecord> => {
  const record = await prisma.vatReturn.findUnique({ where: { id } });

  if (!record) {
    throw notFound('PDV prijava nije pronađena.');
  }

  return record;
};

const assertMonthIsFree = async (
  input: Pick<VatReturnWriteRequest, 'year' | 'month'>,
  exceptId?: string,
): Promise<void> => {
  const existing = await prisma.vatReturn.findFirst({
    where: { year: input.year, month: input.month, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });

  if (existing) {
    throw conflict('Za taj mesec je PDV prijava već uneta. Izmenite postojeću.');
  }
};

const toWriteData = (input: VatReturnWriteRequest) => ({
  year: input.year,
  month: input.month,
  kind: input.kind,
  amount: roundMoney(input.amount),
  documentNumber: input.documentNumber,
  filedAt: input.filedAt ? parseDate(input.filedAt) : null,
  note: input.note,
});

export const createVatReturn = async (input: VatReturnWriteRequest): Promise<VatReturnDto> => {
  await assertMonthIsFree(input);

  const record = await prisma.vatReturn.create({
    data: { ...toWriteData(input), organizationId: requireOrganizationId() },
  });
  logger.info('VAT return created', {
    vatReturnId: record.id,
    year: record.year,
    month: record.month,
  });

  return toVatReturnDto(record, 0);
};

export const updateVatReturn = async (
  id: string,
  input: VatReturnWriteRequest,
): Promise<VatReturnDto> => {
  const existing = await getVatReturnRecord(id);
  const settled = (await settledByVatReturn([id])).get(id) ?? 0;

  if (settled > MONEY_EPSILON) {
    if (input.kind !== existing.kind) {
      throw conflict(
        'Prijava već ima povezane uplate; prvo poništite povezivanja da biste promenili vrstu.',
      );
    }

    if (input.amount + MONEY_EPSILON < settled) {
      throw conflict('Iznos prijave ne može biti manji od već povezanih uplata.');
    }
  }

  await assertMonthIsFree(input, id);

  const record = await prisma.vatReturn.update({ where: { id }, data: toWriteData(input) });
  logger.info('VAT return updated', { vatReturnId: id });

  return toVatReturnDto(record, settled);
};

export const deleteVatReturn = async (id: string): Promise<DeleteVatReturnResult> => {
  await getVatReturnRecord(id);

  const allocations = await prisma.paymentAllocation.count({
    where: { targetType: 'VAT_RETURN', targetId: id },
  });

  if (allocations > 0) {
    throw conflict('Prijava ima povezane uplate; prvo poništite povezivanja.');
  }

  await prisma.vatReturn.delete({ where: { id } });
  logger.info('VAT return deleted', { vatReturnId: id });

  return { id, deleted: true };
};
