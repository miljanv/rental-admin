import { createHash } from 'node:crypto';

import type {
  BankStatementEntryWriteRequest,
  BankStatementImportResult,
  BankStatementPreviewResult,
  BankStatementXmlImportRequest,
  DeleteTransactionResult,
  FinanceExportQueryRequest,
  FinanceReportDto,
  FinanceReportQueryRequest,
  ListTransactionsQuery,
  ListSettlementTargetsQuery,
  PaginationMeta,
  PaymentMethod,
  PaymentAllocationDto,
  PaymentAllocationWriteRequest,
  SettleAdvancesRequest,
  SettleAdvancesResult,
  SettlementTargetDto,
  SettlementTargetsDto,
  SettlementTargetType,
  VatReportDto,
  TransactionCategory,
  TransactionDto,
  TransactionType,
  TransactionSourceType,
  TransactionWriteRequest,
  UnsettledAdvanceGroupDto,
  UnsettledAdvancesDto,
  UnsettledAdvancesQuery,
} from '@rental-admin/shared';
import {
  buildFinanceReport,
  companyExpenseFinanceCategory,
  defaultFinanceReportRange,
} from '@rental-admin/shared';

import { prisma, type TransactionClient } from '../config/prisma';
import { financeWrite } from '../utils/finance-write';
import {
  planStatementAllocations,
  type StatementAllocationTarget,
} from '../utils/statement-allocation';
import { canonicalBankAccount, uniqueStatementNameMatch } from '../utils/statement-matching';
import { buildPaginationMeta } from '../utils/api-response';
import { badRequest, conflict, notFound } from '../utils/app-error';
import { logger } from '../utils/logger';
import { buildXlsx } from '../utils/xlsx';
import { toTransactionDto, type FinanceTransactionRecord } from '../utils/transaction-mapper';
import { requireOrganizationId } from '../utils/tenant-context';
import {
  FINANCE_EXPORT_LEDGER_LIMIT,
  buildFinanceExportDocument,
  financeExportSheets,
} from './finance-export-document';
import { buildFinanceReportPdf } from './pdf/finance-report-pdf';
import {
  findSupplierByBankAccount,
  findSupplierIdByName,
  rememberSupplierBankAccount,
} from './supplier.service';

type TransactionSortField = ListTransactionsQuery['sortBy'];
type SortOrder = ListTransactionsQuery['sortOrder'];
type TransactionOrderBy = Partial<Record<TransactionSortField, SortOrder>>;

const parseDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

const retiredFinanceSourceTypes: TransactionSourceType[] = ['COMPANY_EXPENSE', 'TRIP_REVENUE'];
const MONEY_EPSILON = 0.005;

type TransactionListFilters = Omit<
  ListTransactionsQuery,
  'page' | 'limit' | 'sortBy' | 'sortOrder'
>;

const transactionListWhere = (query: TransactionListFilters) => ({
  ...(query.type ? { type: query.type } : {}),
  ...(query.category ? { category: query.category } : {}),
  ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
  ...(query.sourceType
    ? { sourceType: query.sourceType }
    : { sourceType: { notIn: retiredFinanceSourceTypes } }),
  ...(query.status ? { status: query.status } : {}),
  ...(query.isAdvance !== undefined ? { isAdvance: query.isAdvance } : {}),
  ...(query.supplier
    ? { supplier: { contains: query.supplier, mode: 'insensitive' as const } }
    : {}),
  ...(query.partnerId ? { partnerId: query.partnerId } : {}),
  ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
  ...(query.driverId ? { driverId: query.driverId } : {}),
  ...(query.from || query.to
    ? {
        occurredAt: {
          ...(query.from ? { gte: parseDate(query.from) } : {}),
          ...(query.to ? { lte: parseDate(query.to) } : {}),
        },
      }
    : {}),
  ...(query.search
    ? {
        OR: [
          { note: { contains: query.search, mode: 'insensitive' as const } },
          { supplier: { contains: query.search, mode: 'insensitive' as const } },
          { partner: { contains: query.search, mode: 'insensitive' as const } },
          { route: { contains: query.search, mode: 'insensitive' as const } },
          { contractId: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }
    : {}),
});

const transactionInclude = {
  vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
  driver: { select: { id: true, firstName: true, lastName: true } },
  partnerRef: {
    select: {
      id: true,
      type: true,
      companyName: true,
      firstName: true,
      lastName: true,
      nickname: true,
    },
  },
  paymentAllocations: { select: { amount: true } },
} as const;

interface MatchableSupplier {
  id: string;
  name: string;
}

interface MatchablePartner {
  id: string;
  type: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
}

const decodeXmlText = (value: string): string =>
  value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&')
    .trim();

const tagText = (xml: string, tag: string): string | null => {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(xml);
  return match ? decodeXmlText(match[1] ?? '') : null;
};

const childText = (xml: string, parent: string, tag: string): string | null => {
  const block = tagText(xml, parent);
  return block ? tagText(block, tag) : null;
};

const normalizeMatchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'DJ')
    .replace(/đ/g, 'dj')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');

const acronymAlias = (value: string): string | null => {
  const words = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'DJ')
    .replace(/đ/g, 'dj')
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((word) => word.length > 1);

  if (words.length < 2) {
    return null;
  }

  return `${words.map((word) => word[0]).join('')}${words.at(-1)}`;
};

const findPartnerByStatementName = async (rawName: string | null) => {
  const normalizedRaw = rawName ? normalizeMatchText(rawName) : '';

  if (!normalizedRaw) {
    return null;
  }

  const partners = await prisma.partner.findMany({
    select: {
      id: true,
      type: true,
      companyName: true,
      firstName: true,
      lastName: true,
      nickname: true,
    },
  });

  return uniqueStatementNameMatch(partners, rawName, (partner) => [
    partner.companyName ?? '',
    partner.nickname ?? '',
    `${partner.firstName ?? ''} ${partner.lastName ?? ''}`.trim(),
  ]);
};

const resolveFinancePartnerLabel = (
  record: {
    partner: string | null;
    partnerId?: string | null;
    partnerRef?: {
      id: string;
      type: string;
      companyName: string | null;
      firstName: string | null;
      lastName: string | null;
      nickname: string | null;
    } | null;
  },
  partners: Array<{
    id: string;
    type: string;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
    nickname: string | null;
  }>,
): string | null => {
  if (record.partnerRef) {
    return partnerDisplayName(record.partnerRef);
  }

  if (record.partnerId) {
    const partner = partners.find((candidate) => candidate.id === record.partnerId);
    return partner ? partnerDisplayName(partner) : record.partner;
  }

  const rawPartner = record.partner?.trim();

  if (!rawPartner) {
    return null;
  }

  const normalizedRaw = normalizeMatchText(rawPartner);
  const match = partners.find((partner) => {
    const names = [
      partner.companyName,
      partner.nickname,
      `${partner.firstName ?? ''} ${partner.lastName ?? ''}`.trim(),
    ].filter((value): value is string => Boolean(value));

    return names.some((name) => {
      const normalized = normalizeMatchText(name);
      const acronym = acronymAlias(name);

      return (
        (normalized.length >= 5 && normalizedRaw.includes(normalized)) ||
        (acronym !== null && acronym.length >= 4 && normalizedRaw.includes(acronym))
      );
    });
  });

  return match ? partnerDisplayName(match) : rawPartner;
};

const resolveFinanceSupplierLabel = (
  record: { supplier: string | null; supplierId?: string | null },
  suppliers: MatchableSupplier[],
): string | null => {
  if (record.supplierId) {
    const supplier = suppliers.find((candidate) => candidate.id === record.supplierId);
    return supplier?.name ?? record.supplier;
  }

  const rawSupplier = record.supplier?.trim();

  if (!rawSupplier) {
    return null;
  }

  const normalizedRaw = normalizeMatchText(rawSupplier);
  const match = suppliers.find((supplier) => {
    const normalizedSupplier = normalizeMatchText(supplier.name);

    return (
      normalizedSupplier.length >= 3 &&
      (normalizedRaw.includes(normalizedSupplier) || normalizedSupplier.includes(normalizedRaw))
    );
  });

  return match?.name ?? rawSupplier;
};

const normalizeBankAccount = (value: string | null | undefined): string | null => {
  const normalized = value?.replace(/\s+/g, '').trim() ?? '';
  return normalized.length > 0 ? normalized : null;
};

const partnerDisplayName = (partner: {
  type: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
}): string => {
  const legalName =
    partner.type === 'INDIVIDUAL'
      ? `${partner.firstName ?? ''} ${partner.lastName ?? ''}`.trim()
      : (partner.companyName ?? '');

  return partner.nickname ? `${legalName} (${partner.nickname})` : legalName;
};

const findPartnerByBankAccount = async (accountNumber: string | null) => {
  const normalized = normalizeBankAccount(accountNumber);

  if (!normalized) {
    return null;
  }

  const account = await prisma.partnerBankAccount.findFirst({
    where: { accountNumber: normalized },
    include: {
      partner: {
        select: {
          id: true,
          type: true,
          companyName: true,
          firstName: true,
          lastName: true,
          nickname: true,
        },
      },
    },
  });

  if (account) return account.partner;
  const accounts = await prisma.partnerBankAccount.findMany({ include: { partner: true } });
  const matches = accounts.filter(
    (candidate) =>
      canonicalBankAccount(candidate.accountNumber) === canonicalBankAccount(normalized),
  );
  const ids = new Set(matches.map((candidate) => candidate.partnerId));
  return ids.size === 1 ? matches[0]!.partner : null;
};

const findSupplierForStatementEntry = async (
  payeeName: string | null,
  accountNumber: string | null,
): Promise<{ id: string; name: string; matchedByAccount: boolean } | null> => {
  const accountMatch = await findSupplierByBankAccount(accountNumber);

  if (accountMatch) {
    return { ...accountMatch, matchedByAccount: true };
  }

  const supplierId = await findSupplierIdByName(payeeName);

  if (!supplierId) {
    return null;
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { id: true, name: true },
  });

  return supplier ? { ...supplier, matchedByAccount: false } : null;
};

const inferStatementCategory = (
  type: TransactionType,
  payeeName: string | null,
  purpose: string | null,
): TransactionCategory => {
  if (type === 'INCOME') {
    return 'CONTRACT';
  }

  const text = normalizeMatchText(`${payeeName ?? ''} ${purpose ?? ''}`);

  if (text.includes('GORIVO') || text.includes('NIS') || text.includes('OMV')) {
    return 'FUEL';
  }

  if (text.includes('TAHOGRAF')) {
    return 'TACHOGRAPH';
  }

  return 'OTHER';
};

interface ParsedStatementEntry {
  type: TransactionType;
  amount: number;
  occurredAt: string;
  payeeName: string | null;
  payeeAccountNumber: string | null;
  purpose: string | null;
  purposeCode: string | null;
  payeeReferenceNumber: string | null;
  fitId: string | null;
}

interface ParsedBankStatementXml {
  accountNumber: string | null;
  statementNumber: string | null;
  entries: ParsedStatementEntry[];
}

const parseBankStatementXml = (xml: string): ParsedBankStatementXml => {
  const entries = [...xml.matchAll(/<stmttrn>([\s\S]*?)<\/stmttrn>/gi)].map((match) => {
    const block = match[1] ?? '';
    const benefit = tagText(block, 'benefit')?.toLowerCase();
    const type: TransactionType = benefit === 'credit' ? 'INCOME' : 'EXPENSE';
    const amount = Math.abs(Number(tagText(block, 'trnamt') ?? '0'));
    const occurredAt = (tagText(block, 'dtposted') ?? tagText(block, 'dtavail') ?? '').slice(0, 10);

    return {
      type,
      amount,
      occurredAt,
      payeeName: childText(block, 'payeeinfo', 'name'),
      payeeAccountNumber: childText(block, 'payeeaccountinfo', 'acctid'),
      purpose: tagText(block, 'purpose'),
      purposeCode: tagText(block, 'purposecode'),
      payeeReferenceNumber: tagText(block, 'payeerefnumber') || tagText(block, 'refnumber'),
      fitId: tagText(block, 'fitid'),
    };
  });

  return {
    accountNumber: tagText(xml, 'acctid'),
    statementNumber: tagText(xml, 'stmtnumber'),
    entries,
  };
};

const isValidStatementEntry = (entry: ParsedStatementEntry): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(entry.occurredAt) &&
  !Number.isNaN(parseDate(entry.occurredAt).getTime()) &&
  toIsoDate(parseDate(entry.occurredAt)) === entry.occurredAt &&
  Number.isFinite(entry.amount) &&
  entry.amount > 0;

const assertVehicleExists = async (vehicleId: string | null): Promise<void> => {
  if (!vehicleId) {
    return;
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true },
  });

  if (!vehicle) {
    throw badRequest('Izabrano vozilo ne postoji.');
  }
};

const assertDriverExists = async (driverId: string | null): Promise<void> => {
  if (!driverId) {
    return;
  }

  const driver = await prisma.driver.findUnique({ where: { id: driverId }, select: { id: true } });

  if (!driver) {
    throw badRequest('Izabrani vozač ne postoji.');
  }
};

const assertPartnerExists = async (partnerId: string | null | undefined): Promise<void> => {
  if (!partnerId) {
    return;
  }

  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: { id: true },
  });

  if (!partner) {
    throw badRequest('Izabrani partner ne postoji.');
  }
};

const assertContractExists = async (contractId: string | null | undefined): Promise<void> => {
  if (!contractId) {
    return;
  }

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: { id: true },
  });

  if (!contract) {
    throw badRequest('Izabrani ugovor ne postoji.');
  }
};

/**
 * Every id a transaction write takes from the request must be looked up first:
 * the lookups are limited to the caller's organization, which is what stops a
 * foreign vehicle, driver, partner or contract from being attached.
 */
const assertReferencesExist = async (input: {
  vehicleId: string | null;
  driverId: string | null;
  partnerId?: string | null | undefined;
  contractId?: string | null | undefined;
}): Promise<void> => {
  await assertVehicleExists(input.vehicleId);
  await assertDriverExists(input.driverId);
  await assertPartnerExists(input.partnerId);
  await assertContractExists(input.contractId);
};

const toManualWriteData = async (input: TransactionWriteRequest) => ({
  type: input.type,
  category: input.category,
  amount: input.amount,
  occurredAt: parseDate(input.occurredAt),
  paymentMethod: input.paymentMethod,
  note: input.note,
  supplier: input.supplier,
  supplierId: await findSupplierIdByName(input.supplier),
  partner: input.partner,
  partnerId: input.partnerId,
  route: input.route,
  vehicleId: input.vehicleId,
  driverId: input.driverId,
  contractId: input.contractId,
  isAdvance: input.isAdvance,
  status: input.isAdvance ? ('OPEN' as const) : ('OPEN' as const),
  sourceType: 'MANUAL' as const,
  sourceId: null,
  statementNumber: null,
  bankReference: null,
  linkedTransactionId: null,
});

const toBankStatementWriteData = async (input: BankStatementEntryWriteRequest) => ({
  type: input.type,
  category: input.category,
  amount: input.amount,
  occurredAt: parseDate(input.occurredAt),
  paymentMethod: 'ACCOUNT' as const,
  note: input.note,
  supplier: input.supplier,
  supplierId: await findSupplierIdByName(input.supplier),
  partner: input.partner,
  partnerId: input.partnerId ?? (await findPartnerByStatementName(input.partner))?.id ?? null,
  route: input.route,
  vehicleId: input.vehicleId,
  driverId: input.driverId,
  contractId: input.contractId,
  isAdvance: false,
  status: 'SETTLED' as const,
  sourceType: 'BANK_STATEMENT' as const,
  sourceId: null,
  statementNumber: input.statementNumber,
  bankReference: input.bankReference,
  linkedTransactionId: null,
});

export const listTransactions = async (
  query: ListTransactionsQuery,
): Promise<{ transactions: TransactionDto[]; pagination: PaginationMeta }> => {
  const orderBy: TransactionOrderBy = { [query.sortBy]: query.sortOrder };

  const unresolved = query.unallocatedOnly
    ? await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT t.id FROM transactions t
    LEFT JOIN payment_allocations a ON a."transactionId" = t.id
    WHERE t."sourceType" = 'BANK_STATEMENT'
      AND t."organizationId" = ${requireOrganizationId()}
    GROUP BY t.id
    HAVING t.amount - COALESCE(SUM(a.amount), 0) > 0.005
  `
    : null;
  const where = {
    ...transactionListWhere(query),
    ...(unresolved ? { id: { in: unresolved.map((row) => row.id) } } : {}),
  };

  const [total, records] = await Promise.all([
    prisma.financeTransaction.count({ where }),
    prisma.financeTransaction.findMany({
      where,
      include: transactionInclude,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    transactions: records.map((record: FinanceTransactionRecord) => toTransactionDto(record)),
    pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
  };
};

export const getTransaction = async (id: string): Promise<TransactionDto> => {
  const record = await prisma.financeTransaction.findUnique({
    where: { id },
    include: transactionInclude,
  });

  if (!record) {
    throw notFound('Transakcija nije pronađena.');
  }

  return toTransactionDto(record);
};

export const createTransaction = async (
  input: TransactionWriteRequest,
): Promise<TransactionDto> => {
  await assertReferencesExist(input);

  const record = await prisma.financeTransaction.create({
    data: { ...(await toManualWriteData(input)), organizationId: requireOrganizationId() },
    include: transactionInclude,
  });

  logger.info('Transaction created', { transactionId: record.id, isAdvance: record.isAdvance });

  return toTransactionDto(record);
};

export const createBankStatementEntry = async (
  input: BankStatementEntryWriteRequest,
): Promise<TransactionDto> => {
  await assertReferencesExist(input);

  const data = {
    ...(await toBankStatementWriteData(input)),
    organizationId: requireOrganizationId(),
  };
  const record = await financeWrite(async (tx) => {
    const created = await tx.financeTransaction.create({ data, include: transactionInclude });
    await reconcileStatement(tx, created);
    return tx.financeTransaction.findUniqueOrThrow({
      where: { id: created.id },
      include: transactionInclude,
    });
  });

  logger.info('Bank statement entry created', {
    transactionId: record.id,
    statementNumber: record.statementNumber,
  });

  return toTransactionDto(record);
};

export const importBankStatementXml = async (
  input: BankStatementXmlImportRequest,
): Promise<BankStatementImportResult> => {
  const parsed = parseBankStatementXml(input.xml);

  if (parsed.entries.length === 0) {
    throw badRequest('XML ne sadrži stavke izvoda.');
  }

  const imported: FinanceTransactionRecord[] = [];
  let duplicateSkipped = 0;
  let invalidSkipped = 0;
  let matchedPartners = 0;
  let matchedSuppliers = 0;
  let allocated = 0;
  let unallocated = 0;

  const occurrences = new Map<string, number>();
  for (const entry of parsed.entries) {
    if (!isValidStatementEntry(entry)) {
      invalidSkipped += 1;
      continue;
    }

    // Some banks omit FITID. Keep every row, including identical rows in one
    // statement, while making a repeat import of that statement idempotent.
    const fingerprint = createHash('sha256')
      .update(
        JSON.stringify({
          account: canonicalBankAccount(parsed.accountNumber),
          statement: parsed.statementNumber,
          entry,
        }),
      )
      .digest('hex');
    const occurrence = occurrences.get(fingerprint) ?? 0;
    occurrences.set(fingerprint, occurrence + 1);
    const bankReference = entry.fitId ?? `xml:${fingerprint}:${occurrence}`;
    const sourceId = `bank:${canonicalBankAccount(parsed.accountNumber)}:${bankReference}`;

    const accountNumber = normalizeBankAccount(entry.payeeAccountNumber);
    const isIncome = entry.type === 'INCOME';
    let matchedPartner: MatchablePartner | null = null;
    let matchedSupplier: { id: string; name: string; matchedByAccount: boolean } | null = null;
    let matchedByAccount = false;

    if (isIncome) {
      matchedPartner = await findPartnerByBankAccount(accountNumber);
      matchedByAccount = Boolean(matchedPartner);

      if (!matchedPartner) {
        matchedPartner = await findPartnerByStatementName(entry.payeeName);

        if (matchedPartner && input.rememberMatchedAccounts && accountNumber) {
          await prisma.partnerBankAccount
            .create({
              data: {
                organizationId: requireOrganizationId(),
                partnerId: matchedPartner.id,
                accountNumber,
              },
            })
            .catch(() => null);
        }
      }

      if (matchedPartner) {
        matchedPartners += 1;
      }
    } else {
      matchedSupplier = await findSupplierForStatementEntry(entry.payeeName, accountNumber);
      matchedByAccount = Boolean(matchedSupplier?.matchedByAccount);

      if (matchedSupplier) {
        matchedSuppliers += 1;

        if (!matchedSupplier.matchedByAccount && input.rememberMatchedAccounts && accountNumber) {
          await rememberSupplierBankAccount(matchedSupplier.id, accountNumber);
        }
      }
    }

    const partnerName = matchedPartner ? partnerDisplayName(matchedPartner) : entry.payeeName;
    const supplierName = matchedSupplier?.name ?? entry.payeeName;
    const noteParts = [
      entry.purpose,
      entry.purposeCode ? `Šifra ${entry.purposeCode}` : null,
      entry.payeeReferenceNumber ? `Poziv ${entry.payeeReferenceNumber}` : null,
      accountNumber ? `Račun ${accountNumber}` : null,
      !matchedByAccount && matchedPartner ? 'Kupac povezan po nazivu' : null,
      !matchedByAccount && matchedSupplier ? 'Dobavljač povezan po nazivu' : null,
    ].filter(Boolean);

    const outcome = await financeWrite(async (tx) => {
      const existing = await tx.financeTransaction.findFirst({
        where: {
          sourceType: 'BANK_STATEMENT',
          OR: [
            { sourceId },
            ...(entry.fitId
              ? [{ sourceId: entry.fitId }, { sourceId: null, bankReference: entry.fitId }]
              : []),
          ],
        },
        select: { id: true, partnerId: true, supplierId: true },
      });

      if (existing) {
        if (isIncome && matchedPartner && !existing.partnerId) {
          await tx.financeTransaction.update({
            where: { id: existing.id },
            data: {
              partner: partnerName ?? null,
              partnerId: matchedPartner.id,
            },
          });
        }

        if (!isIncome && matchedSupplier && !existing.supplierId) {
          await tx.financeTransaction.update({
            where: { id: existing.id },
            data: {
              supplier: supplierName ?? null,
              supplierId: matchedSupplier.id,
            },
          });
        }

        const record = await tx.financeTransaction.findUniqueOrThrow({
          where: { id: existing.id },
          include: transactionInclude,
        });
        await reconcileStatement(tx, record, entry.payeeReferenceNumber);
        return {
          duplicate: true,
          record: await tx.financeTransaction.findUniqueOrThrow({
            where: { id: existing.id },
            include: transactionInclude,
          }),
        };
      }

      const record = await tx.financeTransaction.create({
        data: {
          organizationId: requireOrganizationId(),
          type: entry.type,
          category: inferStatementCategory(entry.type, entry.payeeName, entry.purpose),
          amount: entry.amount,
          occurredAt: parseDate(entry.occurredAt),
          paymentMethod: 'ACCOUNT',
          note: noteParts.join(' · ') || null,
          supplier: isIncome ? null : (supplierName ?? null),
          supplierId: isIncome ? null : (matchedSupplier?.id ?? null),
          partner: isIncome ? (partnerName ?? null) : null,
          partnerId: isIncome ? (matchedPartner?.id ?? null) : null,
          route: null,
          vehicleId: null,
          driverId: null,
          contractId: null,
          isAdvance: false,
          status: 'SETTLED',
          sourceType: 'BANK_STATEMENT',
          sourceId,
          statementNumber: parsed.statementNumber,
          bankReference,
          linkedTransactionId: null,
        },
        include: transactionInclude,
      });

      await reconcileStatement(tx, record, entry.payeeReferenceNumber);
      return {
        duplicate: false,
        record: await tx.financeTransaction.findUniqueOrThrow({
          where: { id: record.id },
          include: transactionInclude,
        }),
      };
    });
    const dto = toTransactionDto(outcome.record);
    if (dto.allocatedAmount > MONEY_EPSILON) allocated += 1;
    if (dto.unallocatedAmount > MONEY_EPSILON) unallocated += 1;
    if (outcome.duplicate) duplicateSkipped += 1;
    else imported.push(outcome.record);
  }

  logger.info('Bank statement XML imported', {
    statementNumber: parsed.statementNumber,
    imported: imported.length,
    duplicateSkipped,
    invalidSkipped,
    matchedSuppliers,
  });

  return {
    statementNumber: parsed.statementNumber,
    accountNumber: normalizeBankAccount(parsed.accountNumber),
    imported: imported.length,
    skipped: duplicateSkipped + invalidSkipped,
    duplicateSkipped,
    invalidSkipped,
    matchedPartners,
    matchedSuppliers,
    allocated,
    unallocated,
    transactions: imported.map((record) => toTransactionDto(record)),
  };
};

const loadStatementAllocationTargets = async (
  tx: TransactionClient,
  input: {
    type: TransactionType;
    supplierId: string | null;
    partnerId: string | null;
    occurredAt: Date;
  },
): Promise<StatementAllocationTarget[]> => {
  const targets: StatementAllocationTarget[] = [];

  if (input.type === 'EXPENSE' && input.supplierId) {
    const supplier = await tx.supplier.findUniqueOrThrow({ where: { id: input.supplierId } });
    const expenses = await tx.companyExpense.findMany({
      where: {
        OR: [
          { supplierId: supplier.id },
          { supplierId: null, supplier: { equals: supplier.name, mode: 'insensitive' } },
        ],
        paidAt: null,
        paymentMethod: 'ACCOUNT',
        issuedAt: { lte: input.occurredAt },
      },
    });
    const allocated = await allocatedByTarget(
      'COMPANY_EXPENSE',
      expenses.map((expense) => expense.id),
      tx,
    );
    for (const expense of expenses) {
      targets.push({
        targetType: 'COMPANY_EXPENSE',
        targetId: expense.id,
        reference: expense.invoiceNumber,
        issuedAt: expense.issuedAt,
        remainingAmount: roundMoney(expense.amountWithVat - (allocated.get(expense.id) ?? 0)),
      });
    }
  } else if (input.type === 'INCOME' && input.partnerId) {
    const partner = await tx.partner.findUniqueOrThrow({ where: { id: input.partnerId } });
    const names = [
      partner.companyName,
      partner.nickname,
      `${partner.firstName ?? ''} ${partner.lastName ?? ''}`.trim(),
    ].filter((name): name is string => Boolean(name));
    const trips = await tx.trip.findMany({
      where: {
        OR: [
          { partnerId: partner.id },
          ...names.map((name) => ({
            partnerId: null,
            clientName: { equals: name, mode: 'insensitive' as const },
          })),
        ],
        invoicedAt: { not: null, lte: input.occurredAt },
        paymentMethod: 'ACCOUNT',
      },
    });
    const groups = new Map<string, typeof trips>();
    for (const trip of trips) {
      const key = trip.invoiceGroupId ?? trip.id;
      const group = groups.get(key) ?? [];
      group.push(trip);
      groups.set(key, group);
    }
    const singleAllocated = await allocatedByTarget(
      'TRIP_INVOICE',
      trips.filter((trip) => !trip.invoiceGroupId).map((trip) => trip.id),
      tx,
    );
    const seriesAllocated = await allocatedByTarget('TRIP_SERIES_INVOICE', [...groups.keys()], tx);
    for (const [targetId, group] of groups) {
      const first = group[0]!;
      if (group.some((trip) => trip.paidAt !== null)) continue;
      if (first.invoiceGroupId) {
        const count = await tx.trip.count({ where: { invoiceGroupId: first.invoiceGroupId } });
        if (count !== group.length) continue;
      }
      const allocated =
        (first.invoiceGroupId ? seriesAllocated : singleAllocated).get(targetId) ?? 0;
      targets.push({
        targetType: first.invoiceGroupId ? 'TRIP_SERIES_INVOICE' : 'TRIP_INVOICE',
        targetId,
        reference: first.referenceNumber,
        issuedAt: first.invoicedAt!,
        remainingAmount: roundMoney(
          group.reduce((sum, trip) => sum + (trip.invoiceGrossAmount ?? trip.price ?? 0), 0) -
            allocated,
        ),
      });
    }
  }

  return targets;
};

const reconcileStatement = async (
  tx: TransactionClient,
  transaction: FinanceTransactionRecord,
  reference: string | null = transaction.note?.match(/(?:^| · )Poziv ([^·]+)/)?.[1]?.trim() ?? null,
): Promise<void> => {
  const available = toTransactionDto(transaction).unallocatedAmount;
  if (available <= MONEY_EPSILON) return;
  const targets = await loadStatementAllocationTargets(tx, transaction);
  for (const allocation of planStatementAllocations(available, targets, reference)) {
    await tx.paymentAllocation.upsert({
      where: {
        transactionId_targetType_targetId: {
          transactionId: transaction.id,
          targetType: allocation.targetType,
          targetId: allocation.targetId,
        },
      },
      create: {
        transactionId: transaction.id,
        targetType: allocation.targetType,
        targetId: allocation.targetId,
        amount: allocation.amount,
        note: 'Automatski iz izvoda',
      },
      update: { amount: { increment: allocation.amount } },
    });
    // Attach legacy documents to the same master record as the payment.
    if (allocation.targetType === 'COMPANY_EXPENSE') {
      await tx.companyExpense.updateMany({
        where: { id: allocation.targetId, supplierId: null },
        data: { supplierId: transaction.supplierId },
      });
    } else {
      await tx.trip.updateMany({
        where: {
          ...(allocation.targetType === 'TRIP_INVOICE'
            ? { id: allocation.targetId }
            : { invoiceGroupId: allocation.targetId }),
          partnerId: null,
        },
        data: { partnerId: transaction.partnerId },
      });
    }
    await refreshTargetPaidAt(
      allocation.targetType,
      allocation.targetId,
      transaction.occurredAt,
      tx,
    );
  }
};

export const previewBankStatementXml = async (
  input: BankStatementXmlImportRequest,
): Promise<BankStatementPreviewResult> => {
  const parsed = parseBankStatementXml(input.xml);

  if (parsed.entries.length === 0) {
    throw badRequest('XML ne sadrži stavke izvoda.');
  }

  return prisma.$transaction(async (tx) => {
    const rows: BankStatementPreviewResult['rows'] = [];
    const occurrences = new Map<string, number>();
    const seenSourceIds = new Set<string>();
    const plannedByTarget = new Map<string, number>();

    for (const [index, entry] of parsed.entries.entries()) {
      const accountNumber = normalizeBankAccount(entry.payeeAccountNumber);
      const category = inferStatementCategory(entry.type, entry.payeeName, entry.purpose);

      if (!isValidStatementEntry(entry)) {
        rows.push({
          id: `invalid-${index + 1}`,
          type: entry.type,
          category,
          amount: entry.amount,
          occurredAt: entry.occurredAt,
          payeeName: entry.payeeName,
          accountNumber,
          reference: entry.payeeReferenceNumber,
          purpose: entry.purpose,
          counterpartyId: null,
          counterpartyName: null,
          matchMethod: 'NONE',
          matchReason: 'Stavka nema ispravan datum ili pozitivan iznos.',
          willRememberAccount: false,
          allocations: [],
          allocatedAmount: 0,
          unallocatedAmount: Number.isFinite(entry.amount) ? entry.amount : 0,
          status: 'INVALID',
        });
        continue;
      }

      const fingerprint = createHash('sha256')
        .update(
          JSON.stringify({
            account: canonicalBankAccount(parsed.accountNumber),
            statement: parsed.statementNumber,
            entry,
          }),
        )
        .digest('hex');
      const occurrence = occurrences.get(fingerprint) ?? 0;
      occurrences.set(fingerprint, occurrence + 1);
      const bankReference = entry.fitId ?? `xml:${fingerprint}:${occurrence}`;
      const sourceId = `bank:${canonicalBankAccount(parsed.accountNumber)}:${bankReference}`;
      const duplicate =
        seenSourceIds.has(sourceId) ||
        Boolean(
          await tx.financeTransaction.findFirst({
            where: {
              sourceType: 'BANK_STATEMENT',
              OR: [
                { sourceId },
                ...(entry.fitId
                  ? [{ sourceId: entry.fitId }, { sourceId: null, bankReference: entry.fitId }]
                  : []),
              ],
            },
            select: { id: true },
          }),
        );
      seenSourceIds.add(sourceId);

      let counterpartyId: string | null = null;
      let counterpartyName: string | null = null;
      let matchMethod: BankStatementPreviewResult['rows'][number]['matchMethod'] = 'NONE';

      if (entry.type === 'INCOME') {
        let partner = await findPartnerByBankAccount(accountNumber);
        if (partner) {
          matchMethod = 'BANK_ACCOUNT';
        } else {
          partner = await findPartnerByStatementName(entry.payeeName);
          if (partner) matchMethod = 'NAME';
        }
        counterpartyId = partner?.id ?? null;
        counterpartyName = partner ? partnerDisplayName(partner) : null;
      } else {
        const supplier = await findSupplierForStatementEntry(entry.payeeName, accountNumber);
        counterpartyId = supplier?.id ?? null;
        counterpartyName = supplier?.name ?? null;
        matchMethod = supplier ? (supplier.matchedByAccount ? 'BANK_ACCOUNT' : 'NAME') : 'NONE';
      }

      if (duplicate) {
        rows.push({
          id: sourceId,
          type: entry.type,
          category,
          amount: entry.amount,
          occurredAt: entry.occurredAt,
          payeeName: entry.payeeName,
          accountNumber,
          reference: entry.payeeReferenceNumber,
          purpose: entry.purpose,
          counterpartyId,
          counterpartyName,
          matchMethod,
          matchReason: 'Stavka sa istom bankarskom referencom je već u evidenciji.',
          willRememberAccount: false,
          allocations: [],
          allocatedAmount: 0,
          unallocatedAmount: 0,
          status: 'DUPLICATE',
        });
        continue;
      }

      const targets = await loadStatementAllocationTargets(tx, {
        type: entry.type,
        supplierId: entry.type === 'EXPENSE' ? counterpartyId : null,
        partnerId: entry.type === 'INCOME' ? counterpartyId : null,
        occurredAt: parseDate(entry.occurredAt),
      });
      const adjustedTargets = targets.map((target) => ({
        ...target,
        remainingAmount: roundMoney(
          target.remainingAmount -
            (plannedByTarget.get(`${target.targetType}:${target.targetId}`) ?? 0),
        ),
      }));
      const plan = planStatementAllocations(
        entry.amount,
        adjustedTargets,
        entry.payeeReferenceNumber,
      );
      const allocations = [];

      for (const allocation of plan) {
        const key = `${allocation.targetType}:${allocation.targetId}`;
        plannedByTarget.set(key, (plannedByTarget.get(key) ?? 0) + allocation.amount);
        const target = await getSettlementTarget(allocation.targetType, allocation.targetId, tx);
        allocations.push({
          targetType: allocation.targetType,
          targetId: allocation.targetId,
          label: target.label,
          counterparty: target.counterparty,
          amount: allocation.amount,
        });
      }

      const allocatedAmount = roundMoney(
        allocations.reduce((sum, allocation) => sum + allocation.amount, 0),
      );
      const unallocatedAmount = roundMoney(entry.amount - allocatedAmount);
      const status =
        allocatedAmount <= MONEY_EPSILON
          ? 'UNALLOCATED'
          : unallocatedAmount > MONEY_EPSILON
            ? 'PARTIAL'
            : matchMethod === 'NAME'
              ? 'REVIEW'
              : 'READY';
      const matchReason =
        matchMethod === 'BANK_ACCOUNT'
          ? 'Partner je pronađen po bankovnom računu.'
          : matchMethod === 'NAME'
            ? input.rememberMatchedAccounts && accountNumber
              ? 'Partner je pronađen po nazivu; račun će biti zapamćen pri uvozu.'
              : 'Partner je pronađen samo po nazivu.'
            : 'Partner ili dobavljač nije pronađen.';

      rows.push({
        id: sourceId,
        type: entry.type,
        category,
        amount: entry.amount,
        occurredAt: entry.occurredAt,
        payeeName: entry.payeeName,
        accountNumber,
        reference: entry.payeeReferenceNumber,
        purpose: entry.purpose,
        counterpartyId,
        counterpartyName,
        matchMethod,
        matchReason,
        willRememberAccount:
          matchMethod === 'NAME' && input.rememberMatchedAccounts && accountNumber !== null,
        allocations,
        allocatedAmount,
        unallocatedAmount,
        status,
      });
    }

    return {
      statementNumber: parsed.statementNumber,
      accountNumber: normalizeBankAccount(parsed.accountNumber),
      rows,
      summary: {
        total: rows.length,
        ready: rows.filter((row) => row.status === 'READY').length,
        review: rows.filter((row) => row.status === 'REVIEW').length,
        partial: rows.filter((row) => row.status === 'PARTIAL').length,
        unallocated: rows.filter((row) => row.status === 'UNALLOCATED').length,
        duplicates: rows.filter((row) => row.status === 'DUPLICATE').length,
        invalid: rows.filter((row) => row.status === 'INVALID').length,
      },
    };
  });
};

export const updateTransaction = async (
  id: string,
  input: TransactionWriteRequest,
): Promise<TransactionDto> => {
  const existing = await prisma.financeTransaction.findUnique({ where: { id } });

  if (!existing) {
    throw notFound('Transakcija nije pronađena.');
  }

  if (existing.sourceType !== 'MANUAL') {
    throw conflict('Automatska transakcija se menja izvornim zapisom, ne ručno.');
  }

  if (existing.status === 'SETTLED') {
    throw conflict('Razdužena transakcija se ne može menjati.');
  }

  await assertReferencesExist(input);

  const record = await prisma.financeTransaction.update({
    where: { id },
    data: await toManualWriteData(input),
    include: transactionInclude,
  });

  logger.info('Transaction updated', { transactionId: id });

  return toTransactionDto(record);
};

export const updateBankStatementEntry = async (
  id: string,
  input: BankStatementEntryWriteRequest,
): Promise<TransactionDto> => {
  await assertReferencesExist(input);
  const data = await toBankStatementWriteData(input);
  return financeWrite(async (tx) => {
    const existing = await tx.financeTransaction.findUnique({
      where: { id },
      include: transactionInclude,
    });
    if (!existing) throw notFound('Stavka izvoda nije pronađena.');
    if (existing.sourceType !== 'BANK_STATEMENT')
      throw conflict('Samo stavke izvoda se menjaju iz ovog dela finansija.');
    if (
      existing.paymentAllocations.length > 0 &&
      (existing.amount !== data.amount ||
        existing.type !== data.type ||
        existing.partnerId !== data.partnerId ||
        existing.supplierId !== data.supplierId ||
        toIsoDate(existing.occurredAt) !== input.occurredAt)
    )
      throw conflict('Rasknjiženoj stavci nije moguće menjati iznos, smer, datum ili stranku.');
    const record = await tx.financeTransaction.update({
      where: { id },
      data: {
        ...data,
        sourceId: existing.sourceId,
        linkedTransactionId: existing.linkedTransactionId,
      },
      include: transactionInclude,
    });
    await reconcileStatement(tx, record);
    return toTransactionDto(
      await tx.financeTransaction.findUniqueOrThrow({ where: { id }, include: transactionInclude }),
    );
  });
};

export const deleteTransaction = async (id: string): Promise<DeleteTransactionResult> =>
  financeWrite(async (tx) => {
    const existing = await tx.financeTransaction.findUnique({
      where: { id },
      select: { id: true, sourceType: true, isAdvance: true, status: true },
    });

    if (!existing) {
      throw notFound('Transakcija nije pronađena.');
    }

    if (existing.sourceType !== 'MANUAL' && existing.sourceType !== 'BANK_STATEMENT') {
      throw conflict('Automatska transakcija se briše brisanjem izvornog zapisa.');
    }

    const linkedAdvances = await tx.financeTransaction.count({
      where: { linkedTransactionId: id },
    });

    if (linkedAdvances > 0) {
      await tx.financeTransaction.updateMany({
        where: { linkedTransactionId: id },
        data: { linkedTransactionId: null, status: 'OPEN' },
      });
    }

    const allocations = await tx.paymentAllocation.findMany({ where: { transactionId: id } });
    await tx.financeTransaction.delete({ where: { id } });
    for (const allocation of allocations) {
      await refreshTargetPaidAt(allocation.targetType, allocation.targetId, new Date(), tx);
    }
    logger.info('Transaction deleted', { transactionId: id, reopenedAdvances: linkedAdvances });

    return { id, deleted: true };
  });

export const listUnsettledAdvances = async (
  query: UnsettledAdvancesQuery,
): Promise<UnsettledAdvancesDto> => {
  const records = await prisma.financeTransaction.findMany({
    where: {
      isAdvance: true,
      status: 'OPEN',
      ...(query.supplier
        ? { supplier: { equals: query.supplier, mode: 'insensitive' as const } }
        : {}),
    },
    include: transactionInclude,
    orderBy: [{ supplier: 'asc' }, { occurredAt: 'asc' }],
  });

  const bySupplier = new Map<string, FinanceTransactionRecord[]>();

  for (const record of records) {
    const key = record.supplier?.trim() || 'Bez dobavljača';
    const group = bySupplier.get(key) ?? [];
    group.push(record);
    bySupplier.set(key, group);
  }

  const groups: UnsettledAdvanceGroupDto[] = [...bySupplier.entries()].map(
    ([supplier, advances]) => ({
      supplier,
      total: advances.reduce((sum, row) => sum + row.amount, 0),
      count: advances.length,
      advances: advances.map((row) => toTransactionDto(row)),
    }),
  );

  return { groups };
};

export const settleAdvances = async (
  input: SettleAdvancesRequest,
): Promise<SettleAdvancesResult> => {
  const where = {
    isAdvance: true,
    status: 'OPEN' as const,
    supplier: { equals: input.supplier, mode: 'insensitive' as const },
    ...(input.advanceIds ? { id: { in: input.advanceIds } } : {}),
    ...(input.from || input.to
      ? {
          occurredAt: {
            ...(input.from ? { gte: parseDate(input.from) } : {}),
            ...(input.to ? { lte: parseDate(input.to) } : {}),
          },
        }
      : {}),
  };

  const advances = await prisma.financeTransaction.findMany({
    where,
    orderBy: { occurredAt: 'asc' },
  });

  if (advances.length === 0) {
    throw badRequest('Nema nerazduženih avansa za ovog dobavljača u izabranom periodu.');
  }

  if (input.advanceIds && input.advanceIds.length !== advances.length) {
    throw badRequest('Neki od izabranih avansa nisu nerazduženi ili ne pripadaju dobavljaču.');
  }

  const settledTotal = advances.reduce((sum, row) => sum + row.amount, 0);
  const amount = input.amount ?? settledTotal;
  const note = input.note ?? `${input.supplier.toUpperCase()} ISPLAĆENO`;
  const supplierId = await findSupplierIdByName(input.supplier);

  const settlement = await prisma.$transaction(async (tx) => {
    const created = await tx.financeTransaction.create({
      data: {
        organizationId: requireOrganizationId(),
        type: 'EXPENSE',
        category: 'FUEL',
        amount,
        occurredAt: parseDate(input.occurredAt),
        paymentMethod: input.paymentMethod,
        note,
        supplier: input.supplier,
        supplierId,
        isAdvance: false,
        status: 'SETTLED',
        sourceType: 'MANUAL',
        sourceId: null,
      },
      include: transactionInclude,
    });

    await tx.financeTransaction.updateMany({
      where: { id: { in: advances.map((row) => row.id) } },
      data: { linkedTransactionId: created.id, status: 'SETTLED' },
    });

    return created;
  });

  logger.info('Advances settled', {
    settlementId: settlement.id,
    supplier: input.supplier,
    settledCount: advances.length,
    settledTotal,
  });

  return {
    settlement: toTransactionDto(settlement),
    settledCount: advances.length,
    settledTotal,
  };
};

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const toPaymentAllocationDto = (record: {
  id: string;
  transactionId: string;
  targetType: SettlementTargetType;
  targetId: string;
  amount: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}): PaymentAllocationDto => ({
  id: record.id,
  transactionId: record.transactionId,
  targetType: record.targetType,
  targetId: record.targetId,
  amount: record.amount,
  note: record.note,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const targetTypeForTransactionType = (type: 'INCOME' | 'EXPENSE'): SettlementTargetType[] =>
  type === 'EXPENSE' ? ['COMPANY_EXPENSE'] : ['TRIP_INVOICE', 'TRIP_SERIES_INVOICE'];

const allocatedByTarget = async (
  targetType: SettlementTargetType,
  targetIds: string[],
  tx: TransactionClient = prisma,
): Promise<Map<string, number>> => {
  if (targetIds.length === 0) {
    return new Map();
  }

  const rows = await tx.paymentAllocation.groupBy({
    by: ['targetId'],
    where: { targetType, targetId: { in: targetIds } },
    _sum: { amount: true },
  });

  return new Map(rows.map((row) => [row.targetId, row._sum.amount ?? 0]));
};

const settlementTargetSearch = (query: string | undefined): string | undefined =>
  query?.trim() ? query.trim() : undefined;

interface PreferredSettlementCounterparty {
  id: string | null;
  name: string | null;
}

const matchesPreferredCounterparty = (
  candidateId: string | null,
  candidateName: string,
  preferred: PreferredSettlementCounterparty | null,
): boolean => {
  if (!preferred) return false;
  if (preferred.id && candidateId === preferred.id) return true;

  return Boolean(
    preferred.name && normalizeMatchText(candidateName) === normalizeMatchText(preferred.name),
  );
};

const listCompanyExpenseSettlementTargets = async (
  query: ListSettlementTargetsQuery,
  preferred: PreferredSettlementCounterparty | null,
  resultLimit: number | null = query.limit,
): Promise<SettlementTargetDto[]> => {
  const search = settlementTargetSearch(query.search);
  const records = await prisma.companyExpense.findMany({
    where: {
      paidAt: null,
      paymentMethod: 'ACCOUNT',
      ...(preferred?.id
        ? {
            AND: [
              {
                OR: [
                  { supplierId: preferred.id },
                  ...(preferred.name
                    ? [
                        {
                          supplierId: null,
                          supplier: { equals: preferred.name, mode: 'insensitive' as const },
                        },
                      ]
                    : []),
                ],
              },
            ],
          }
        : {}),
      ...(search
        ? {
            OR: [
              { supplier: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { invoiceNumber: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: [{ issuedAt: 'desc' }, { createdAt: 'desc' }],
    ...(resultLimit === null ? {} : { take: Math.max(resultLimit * 4, resultLimit) }),
  });
  const allocated = await allocatedByTarget(
    'COMPANY_EXPENSE',
    records.map((record) => record.id),
  );

  const targets = records
    .map((record): SettlementTargetDto => {
      const allocatedAmount = roundMoney(allocated.get(record.id) ?? 0);
      const remainingAmount = roundMoney(record.amountWithVat - allocatedAmount);

      return {
        targetType: 'COMPANY_EXPENSE',
        targetId: record.id,
        counterpartyId: record.supplierId,
        recommended: matchesPreferredCounterparty(record.supplierId, record.supplier, preferred),
        label: [record.invoiceNumber ? `Račun ${record.invoiceNumber}` : null, record.description]
          .filter(Boolean)
          .join(' · '),
        counterparty: record.supplier,
        issuedAt: toIsoDate(record.issuedAt),
        totalAmount: record.amountWithVat,
        allocatedAmount,
        remainingAmount,
      };
    })
    .filter((target) => target.remainingAmount > MONEY_EPSILON)
    .sort((left, right) => Number(right.recommended) - Number(left.recommended));

  return resultLimit === null ? targets : targets.slice(0, resultLimit);
};

const tripCounterparty = (record: {
  clientName: string | null;
  partner: {
    type: string;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
}): string => {
  if (record.clientName?.trim()) {
    return record.clientName.trim();
  }

  if (!record.partner) {
    return 'Bez kupca';
  }

  if (record.partner.type === 'INDIVIDUAL') {
    return (
      `${record.partner.firstName ?? ''} ${record.partner.lastName ?? ''}`.trim() || 'Bez kupca'
    );
  }

  return record.partner.companyName?.trim() || 'Bez kupca';
};

const tripLabel = (record: {
  referenceNumber: string | null;
  origin: string;
  destination: string;
  invoiceDescription: string | null;
}): string => {
  const route = `${record.origin} – ${record.destination}`;

  return [
    record.referenceNumber ? `RN ${record.referenceNumber}` : null,
    record.invoiceDescription?.trim() || route,
  ]
    .filter(Boolean)
    .join(' · ');
};

const listTripInvoiceSettlementTargets = async (
  query: ListSettlementTargetsQuery,
  preferred: PreferredSettlementCounterparty | null,
  resultLimit: number | null = query.limit,
): Promise<SettlementTargetDto[]> => {
  const search = settlementTargetSearch(query.search);
  const trips = await prisma.trip.findMany({
    where: {
      invoicedAt: { not: null },
      paidAt: null,
      paymentMethod: 'ACCOUNT',
      ...(preferred?.id
        ? {
            AND: [
              {
                OR: [
                  { partnerId: preferred.id },
                  ...(preferred.name
                    ? [
                        {
                          partnerId: null,
                          clientName: { equals: preferred.name, mode: 'insensitive' as const },
                        },
                      ]
                    : []),
                ],
              },
            ],
          }
        : {}),
      ...(search
        ? {
            OR: [
              { referenceNumber: { contains: search, mode: 'insensitive' } },
              { origin: { contains: search, mode: 'insensitive' } },
              { destination: { contains: search, mode: 'insensitive' } },
              { clientName: { contains: search, mode: 'insensitive' } },
              { invoiceDescription: { contains: search, mode: 'insensitive' } },
              { partner: { companyName: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: {
      partner: { select: { type: true, companyName: true, firstName: true, lastName: true } },
    },
    orderBy: [{ invoicedAt: 'desc' }, { departureDate: 'desc' }],
    ...(resultLimit === null ? {} : { take: Math.max(resultLimit * 8, resultLimit) }),
  });

  const standalone = trips.filter((trip) => !trip.invoiceGroupId);
  const seriesGroups = new Map<string, typeof trips>();

  for (const trip of trips) {
    if (!trip.invoiceGroupId) {
      continue;
    }

    const group = seriesGroups.get(trip.invoiceGroupId) ?? [];
    group.push(trip);
    seriesGroups.set(trip.invoiceGroupId, group);
  }

  const standaloneAllocated = await allocatedByTarget(
    'TRIP_INVOICE',
    standalone.map((trip) => trip.id),
  );
  const seriesAllocated = await allocatedByTarget('TRIP_SERIES_INVOICE', [...seriesGroups.keys()]);

  const tripTargets = standalone.map((trip): SettlementTargetDto => {
    const totalAmount = trip.invoiceGrossAmount ?? trip.price ?? 0;
    const allocatedAmount = roundMoney(standaloneAllocated.get(trip.id) ?? 0);

    return {
      targetType: 'TRIP_INVOICE',
      targetId: trip.id,
      counterpartyId: trip.partnerId,
      recommended: matchesPreferredCounterparty(trip.partnerId, tripCounterparty(trip), preferred),
      label: tripLabel(trip),
      counterparty: tripCounterparty(trip),
      issuedAt: toIsoDate(trip.invoicedAt ?? trip.departureDate),
      totalAmount,
      allocatedAmount,
      remainingAmount: roundMoney(totalAmount - allocatedAmount),
    };
  });

  const seriesTargets = [...seriesGroups.entries()].map(([groupId, group]): SettlementTargetDto => {
    const first = group[0];
    const totalAmount = roundMoney(
      group.reduce((sum, trip) => sum + (trip.invoiceGrossAmount ?? trip.price ?? 0), 0),
    );
    const allocatedAmount = roundMoney(seriesAllocated.get(groupId) ?? 0);

    return {
      targetType: 'TRIP_SERIES_INVOICE',
      targetId: groupId,
      counterpartyId: first?.partnerId ?? null,
      recommended: first
        ? matchesPreferredCounterparty(first.partnerId, tripCounterparty(first), preferred)
        : false,
      label: first
        ? `${tripLabel(first)} · serija ${group.length} dana`
        : `Serijska faktura ${groupId}`,
      counterparty: first ? tripCounterparty(first) : 'Bez kupca',
      issuedAt: first ? toIsoDate(first.invoicedAt ?? first.departureDate) : '',
      totalAmount,
      allocatedAmount,
      remainingAmount: roundMoney(totalAmount - allocatedAmount),
    };
  });

  const targets = [...tripTargets, ...seriesTargets]
    .filter((target) => target.totalAmount > MONEY_EPSILON)
    .filter((target) => target.remainingAmount > MONEY_EPSILON)
    .sort(
      (left, right) =>
        Number(right.recommended) - Number(left.recommended) ||
        right.issuedAt.localeCompare(left.issuedAt),
    );

  return resultLimit === null ? targets : targets.slice(0, resultLimit);
};

export const listAllSettlementTargets = async (
  type: 'INCOME' | 'EXPENSE',
): Promise<SettlementTargetDto[]> => {
  const query: ListSettlementTargetsQuery = { type, search: undefined, limit: 100 };

  return type === 'INCOME'
    ? listTripInvoiceSettlementTargets(query, null, null)
    : listCompanyExpenseSettlementTargets(query, null, null);
};

export const listSettlementTargets = async (
  query: ListSettlementTargetsQuery,
): Promise<SettlementTargetsDto> => {
  let type = query.type;
  let preferred: PreferredSettlementCounterparty | null = null;

  if (query.transactionId) {
    const transaction = await prisma.financeTransaction.findUnique({
      where: { id: query.transactionId },
      select: { type: true, supplierId: true, supplier: true, partnerId: true, partner: true },
    });

    if (!transaction) {
      throw notFound('Transakcija nije pronađena.');
    }

    type = transaction.type;
    preferred =
      transaction.type === 'EXPENSE'
        ? { id: transaction.supplierId, name: transaction.supplier }
        : { id: transaction.partnerId, name: transaction.partner };
  }

  if (type === 'EXPENSE') {
    return { targets: await listCompanyExpenseSettlementTargets(query, preferred) };
  }

  if (type === 'INCOME') {
    return { targets: await listTripInvoiceSettlementTargets(query, preferred) };
  }

  return { targets: [] };
};

const getSettlementTarget = async (
  targetType: SettlementTargetType,
  targetId: string,
  tx: TransactionClient = prisma,
): Promise<SettlementTargetDto> => {
  const allocated = await allocatedByTarget(targetType, [targetId], tx);
  const allocatedAmount = roundMoney(allocated.get(targetId) ?? 0);

  if (targetType === 'COMPANY_EXPENSE') {
    const record = await tx.companyExpense.findUnique({ where: { id: targetId } });

    if (!record) {
      throw notFound('Račun dobavljača nije pronađen.');
    }

    if (record.paymentMethod !== 'ACCOUNT') {
      throw conflict('Keš trošak se ne rasknjižava kroz zvanične finansije.');
    }

    if (record.paidAt && allocatedAmount <= MONEY_EPSILON)
      throw conflict('Račun je već označen kao plaćen.');

    return {
      targetType,
      targetId,
      counterpartyId: record.supplierId,
      recommended: false,
      label: [record.invoiceNumber ? `Račun ${record.invoiceNumber}` : null, record.description]
        .filter(Boolean)
        .join(' · '),
      counterparty: record.supplier,
      issuedAt: toIsoDate(record.issuedAt),
      totalAmount: record.amountWithVat,
      allocatedAmount,
      remainingAmount: roundMoney(record.amountWithVat - allocatedAmount),
    };
  }

  if (targetType === 'TRIP_INVOICE') {
    const record = await tx.trip.findUnique({
      where: { id: targetId },
      include: {
        partner: { select: { type: true, companyName: true, firstName: true, lastName: true } },
      },
    });

    if (!record || !record.invoicedAt) {
      throw notFound('Faktura vožnje nije pronađena.');
    }

    if (record.paymentMethod !== 'ACCOUNT') {
      throw conflict('Keš vožnja se naplaćuje samo kroz keš evidenciju.');
    }

    if (record.invoiceGroupId) throw conflict('Koristite mesečnu fakturu serije.');
    if (record.paidAt && allocatedAmount <= MONEY_EPSILON)
      throw conflict('Faktura je već označena kao plaćena.');
    const totalAmount = record.invoiceGrossAmount ?? record.price ?? 0;

    return {
      targetType,
      targetId,
      counterpartyId: record.partnerId,
      recommended: false,
      label: tripLabel(record),
      counterparty: tripCounterparty(record),
      issuedAt: toIsoDate(record.invoicedAt),
      totalAmount,
      allocatedAmount,
      remainingAmount: roundMoney(totalAmount - allocatedAmount),
    };
  }

  const rows = await tx.trip.findMany({
    where: { invoiceGroupId: targetId, invoicedAt: { not: null }, paymentMethod: 'ACCOUNT' },
    include: {
      partner: { select: { type: true, companyName: true, firstName: true, lastName: true } },
    },
    orderBy: { departureDate: 'asc' },
  });
  const first = rows[0];

  if (!first) {
    throw notFound('Mesečna faktura serije nije pronađena.');
  }

  if (rows.some((row) => row.paidAt !== null) && allocatedAmount <= MONEY_EPSILON)
    throw conflict('Faktura je već označena kao plaćena.');
  const totalAmount = roundMoney(
    rows.reduce((sum, row) => sum + (row.invoiceGrossAmount ?? row.price ?? 0), 0),
  );

  return {
    targetType,
    targetId,
    counterpartyId: first.partnerId,
    recommended: false,
    label: `${tripLabel(first)} · serija ${rows.length} dana`,
    counterparty: tripCounterparty(first),
    issuedAt: toIsoDate(first.invoicedAt ?? first.departureDate),
    totalAmount,
    allocatedAmount,
    remainingAmount: roundMoney(totalAmount - allocatedAmount),
  };
};

const refreshTargetPaidAt = async (
  targetType: SettlementTargetType,
  targetId: string,
  paidAt: Date,
  tx: TransactionClient = prisma,
): Promise<void> => {
  const allocated = await allocatedByTarget(targetType, [targetId], tx);
  const allocatedAmount = allocated.get(targetId) ?? 0;
  const latest = await tx.paymentAllocation.findFirst({
    where: { targetType, targetId },
    orderBy: { transaction: { occurredAt: 'desc' } },
    select: { transaction: { select: { occurredAt: true } } },
  });
  const settlementDate = latest?.transaction.occurredAt ?? paidAt;

  if (targetType === 'COMPANY_EXPENSE') {
    const record = await tx.companyExpense.findUnique({
      where: { id: targetId },
      select: { amountWithVat: true },
    });
    const isPaid = record ? allocatedAmount + MONEY_EPSILON >= record.amountWithVat : false;

    await tx.companyExpense.updateMany({
      where: { id: targetId },
      data: { paidAt: isPaid ? settlementDate : null },
    });
    return;
  }

  if (targetType === 'TRIP_INVOICE') {
    const record = await tx.trip.findUnique({
      where: { id: targetId },
      select: { invoiceGrossAmount: true, price: true },
    });
    const totalAmount = record ? (record.invoiceGrossAmount ?? record.price ?? 0) : 0;
    const isPaid = allocatedAmount + MONEY_EPSILON >= totalAmount;

    await tx.trip.updateMany({
      where: { id: targetId },
      data: { paidAt: isPaid ? settlementDate : null },
    });
    return;
  }

  const rows = await tx.trip.findMany({
    where: { invoiceGroupId: targetId },
    select: { invoiceGrossAmount: true, price: true },
  });
  const totalAmount = rows.reduce(
    (sum, row) => sum + (row.invoiceGrossAmount ?? row.price ?? 0),
    0,
  );
  const isPaid = allocatedAmount + MONEY_EPSILON >= totalAmount;

  await tx.trip.updateMany({
    where: { invoiceGroupId: targetId },
    data: { paidAt: isPaid ? settlementDate : null },
  });
};

export const createPaymentAllocation = async (
  transactionId: string,
  input: PaymentAllocationWriteRequest,
): Promise<{ allocation: PaymentAllocationDto; transaction: TransactionDto }> =>
  financeWrite(async (tx) => {
    const transaction = await tx.financeTransaction.findUnique({
      where: { id: transactionId },
      include: transactionInclude,
    });

    if (!transaction) {
      throw notFound('Transakcija nije pronađena.');
    }

    if (transaction.sourceType !== 'MANUAL' && transaction.sourceType !== 'BANK_STATEMENT') {
      throw conflict('Rasknjižavanje je dozvoljeno samo za ručne transakcije i stavke izvoda.');
    }

    if (transaction.paymentMethod !== 'ACCOUNT') {
      throw conflict('Keš transakcije se vode samo u odvojenoj keš evidenciji.');
    }

    if (!targetTypeForTransactionType(transaction.type).includes(input.targetType)) {
      throw badRequest('Izabrano zaduženje ne odgovara smeru transakcije.');
    }

    if (input.targetType === 'COMPANY_EXPENSE') {
      const expense = await tx.companyExpense.findUnique({ where: { id: input.targetId } });
      if (!expense) throw notFound('Račun dobavljača nije pronađen.');
      const supplierId = expense.supplierId ?? (await findSupplierIdByName(expense.supplier));
      if (transaction.supplierId && supplierId !== transaction.supplierId)
        throw conflict('Račun pripada drugom dobavljaču.');
      if (supplierId) {
        await tx.financeTransaction.update({
          where: { id: transactionId },
          data: { supplierId, supplier: expense.supplier },
        });
        await tx.companyExpense.update({ where: { id: expense.id }, data: { supplierId } });
      }
    } else {
      const trips = await tx.trip.findMany({
        where:
          input.targetType === 'TRIP_INVOICE'
            ? { id: input.targetId }
            : { invoiceGroupId: input.targetId },
        include: { partner: true },
      });
      const first = trips[0];
      if (!first) throw notFound('Faktura nije pronađena.');
      if (trips.some((trip) => trip.paymentMethod !== 'ACCOUNT'))
        throw conflict('Keš vožnja se naplaćuje samo kroz keš evidenciju.');
      if (trips.some((trip) => trip.partnerId !== first.partnerId))
        throw conflict('Faktura sadrži različite kupce.');
      const partner = first.partner ?? (await findPartnerByStatementName(first.clientName));
      if (transaction.partnerId && partner?.id !== transaction.partnerId)
        throw conflict('Faktura pripada drugom kupcu.');
      if (partner) {
        await tx.financeTransaction.update({
          where: { id: transactionId },
          data: { partnerId: partner.id, partner: partnerDisplayName(partner) },
        });
        await tx.trip.updateMany({
          where: { id: { in: trips.map((trip) => trip.id) }, partnerId: null },
          data: { partnerId: partner.id },
        });
      }
    }

    const allocatedOnTransaction = transaction.paymentAllocations.reduce(
      (sum, allocation) => sum + allocation.amount,
      0,
    );
    const availableOnTransaction = roundMoney(transaction.amount - allocatedOnTransaction);
    const target = await getSettlementTarget(input.targetType, input.targetId, tx);
    const availableOnTarget = roundMoney(target.remainingAmount);

    if (input.amount > availableOnTransaction + MONEY_EPSILON) {
      throw badRequest('Iznos je veći od nerasknjiženog dela transakcije.');
    }

    if (input.amount > availableOnTarget + MONEY_EPSILON) {
      throw badRequest('Iznos je veći od otvorenog zaduženja.');
    }

    const allocation = await tx.paymentAllocation.upsert({
      where: {
        transactionId_targetType_targetId: {
          transactionId,
          targetType: input.targetType,
          targetId: input.targetId,
        },
      },
      create: {
        transactionId,
        targetType: input.targetType,
        targetId: input.targetId,
        amount: input.amount,
        note: input.note,
      },
      update: {
        amount: { increment: input.amount },
        note: input.note,
      },
    });

    await refreshTargetPaidAt(input.targetType, input.targetId, transaction.occurredAt, tx);

    const updated = await tx.financeTransaction.findUniqueOrThrow({
      where: { id: transactionId },
      include: transactionInclude,
    });

    logger.info('Payment allocation saved', {
      transactionId,
      allocationId: allocation.id,
      targetType: input.targetType,
      targetId: input.targetId,
    });

    return {
      allocation: toPaymentAllocationDto(allocation),
      transaction: toTransactionDto(updated),
    };
  });

export interface OperationalExpenseInput {
  sourceType: Exclude<TransactionSourceType, 'MANUAL' | 'BANK_STATEMENT'>;
  sourceId: string;
  category: TransactionCategory;
  amount: number | null | undefined;
  paymentMethod: PaymentMethod | null | undefined;
  occurredAt: string;
  vehicleId?: string | null;
  driverId?: string | null;
  supplier?: string | null;
  partner?: string | null;
  route?: string | null;
  note?: string | null;
  /** When set, the caller owns open/settled. Omitted calls leave a settled row untouched. */
  status?: 'OPEN' | 'SETTLED';
}

const postedFields = (
  amount: number | null | undefined,
  paymentMethod: PaymentMethod | null | undefined,
): { amount: number; paymentMethod: PaymentMethod } | null => {
  if (
    amount === null ||
    amount === undefined ||
    amount <= 0 ||
    paymentMethod === null ||
    paymentMethod === undefined
  ) {
    return null;
  }

  return { amount, paymentMethod };
};

/**
 * Keeps one FinanceTransaction in sync with an operational source row —
 * an amount of `null`/`undefined` (or one with no payment method) removes
 * the transaction instead of leaving a stale/zero row behind. Shared by
 * every "auto-posted" side effect (fuel, maintenance, trip costs, and now
 * trip revenue and driver payouts) — only the `type` differs.
 */
const upsertOperationalTransaction = async (
  type: 'INCOME' | 'EXPENSE',
  input: OperationalExpenseInput,
): Promise<void> => {
  const existing = await prisma.financeTransaction.findFirst({
    where: { sourceType: input.sourceType, sourceId: input.sourceId },
    select: { id: true, status: true, isAdvance: true },
  });
  const posted = postedFields(input.amount, input.paymentMethod);

  if (!posted) {
    if (existing && existing.status !== 'SETTLED') {
      await prisma.financeTransaction.delete({ where: { id: existing.id } });
    }

    return;
  }

  const data = {
    type,
    category: input.category,
    amount: posted.amount,
    occurredAt: parseDate(input.occurredAt),
    paymentMethod: posted.paymentMethod,
    note: input.note ?? null,
    supplier: input.supplier ?? null,
    supplierId: await findSupplierIdByName(input.supplier),
    partner: input.partner ?? null,
    route: input.route ?? null,
    vehicleId: input.vehicleId ?? null,
    driverId: input.driverId ?? null,
    isAdvance: false,
    status: input.status ?? 'OPEN',
    sourceType: input.sourceType,
    sourceId: input.sourceId,
  };

  if (existing) {
    if (existing.isAdvance) {
      return;
    }

    if (existing.status === 'SETTLED' && input.status === undefined) {
      return;
    }

    await prisma.financeTransaction.update({ where: { id: existing.id }, data });
    return;
  }

  await prisma.financeTransaction.create({
    data: { ...data, organizationId: requireOrganizationId() },
  });
};

export const upsertOperationalExpense = (input: OperationalExpenseInput): Promise<void> =>
  upsertOperationalTransaction('EXPENSE', input);

/** Same upsert-in-place behavior as `upsertOperationalExpense`, posted as INCOME instead. */
export const upsertOperationalIncome = (input: OperationalExpenseInput): Promise<void> =>
  upsertOperationalTransaction('INCOME', input);

export const deleteOperationalTransaction = async (
  sourceType: Exclude<TransactionSourceType, 'MANUAL' | 'BANK_STATEMENT'>,
  sourceId: string,
  options?: { includeSettled?: boolean },
): Promise<void> => {
  await prisma.financeTransaction.deleteMany({
    where: {
      sourceType,
      sourceId,
      ...(options?.includeSettled ? {} : { status: { not: 'SETTLED' as const } }),
    },
  });
};

export const getFinanceReport = async (
  query: FinanceReportQueryRequest,
): Promise<FinanceReportDto> => {
  const defaults = defaultFinanceReportRange();
  const from = query.from ?? defaults.from;
  const to = query.to ?? defaults.to;

  const [records, companyExpenses, partners, suppliers] = await Promise.all([
    prisma.financeTransaction.findMany({
      where: {
        occurredAt: { gte: parseDate(from), lte: parseDate(to) },
        ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
        sourceType: { notIn: retiredFinanceSourceTypes },
        NOT: { isAdvance: true, status: 'SETTLED' },
      },
      select: {
        type: true,
        category: true,
        amount: true,
        occurredAt: true,
        paymentMethod: true,
        supplier: true,
        supplierId: true,
        partner: true,
        partnerId: true,
        partnerRef: {
          select: {
            id: true,
            type: true,
            companyName: true,
            firstName: true,
            lastName: true,
            nickname: true,
          },
        },
        route: true,
        vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
        paymentAllocations: { select: { targetType: true, amount: true } },
      },
    }),
    prisma.companyExpense.findMany({
      where: {
        issuedAt: { gte: parseDate(from), lte: parseDate(to) },
        ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
      },
      include: {
        vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
      },
    }),
    prisma.partner.findMany({
      select: {
        id: true,
        type: true,
        companyName: true,
        firstName: true,
        lastName: true,
        nickname: true,
      },
    }),
    prisma.supplier.findMany({
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  return buildFinanceReport(
    [
      ...records
        .map((record) => {
          const invoiceAllocations =
            record.type === 'EXPENSE'
              ? record.paymentAllocations
                  .filter((allocation) => allocation.targetType === 'COMPANY_EXPENSE')
                  .reduce((sum, allocation) => sum + allocation.amount, 0)
              : 0;

          return {
            type: record.type,
            category: record.category,
            amount: roundMoney(record.amount - invoiceAllocations),
            occurredAt: toIsoDate(record.occurredAt),
            paymentMethod: record.paymentMethod,
            vehicle: record.vehicle,
            partner: resolveFinancePartnerLabel(record, partners),
            supplier: resolveFinanceSupplierLabel(record, suppliers),
            route: record.route,
          };
        })
        .filter((record) => record.amount > MONEY_EPSILON),
      ...companyExpenses.map((expense) => ({
        type: 'EXPENSE' as const,
        category: companyExpenseFinanceCategory(expense.description, expense.scope),
        amount: expense.amountWithVat,
        occurredAt: toIsoDate(expense.issuedAt),
        paymentMethod: expense.paymentMethod,
        vehicle: expense.vehicle,
        partner: null,
        supplier: resolveFinanceSupplierLabel(expense, suppliers),
        route: null,
      })),
    ],
    from,
    to,
  );
};

const monthKey = (value: Date): string => value.toISOString().slice(0, 7);

const listVatMonthsInclusive = (
  from: string,
  to: string,
): Array<{ key: string; year: number; month: number }> => {
  const start = new Date(`${from.slice(0, 7)}-01T00:00:00.000Z`);
  const end = new Date(`${to.slice(0, 7)}-01T00:00:00.000Z`);
  const months: Array<{ key: string; year: number; month: number }> = [];
  const cursor = new Date(start);

  while (cursor.getTime() <= end.getTime()) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth() + 1;
    months.push({ key: `${year}-${String(month).padStart(2, '0')}`, year, month });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
};

export const getVatReport = async (query: FinanceReportQueryRequest): Promise<VatReportDto> => {
  const defaults = defaultFinanceReportRange();
  const from = query.from ?? defaults.from;
  const to = query.to ?? defaults.to;
  const [expenses, trips] = await Promise.all([
    prisma.companyExpense.findMany({
      where: { issuedAt: { gte: parseDate(from), lte: parseDate(to) }, paymentMethod: 'ACCOUNT' },
      select: { issuedAt: true, vatAmount: true },
    }),
    prisma.trip.findMany({
      where: {
        invoicedAt: { gte: parseDate(from), lte: parseDate(to) },
        invoiceVatAmount: { not: null },
        paymentMethod: 'ACCOUNT',
      },
      select: { invoicedAt: true, invoiceVatAmount: true },
    }),
  ]);
  const byMonth = new Map<
    string,
    { year: number; month: number; inputVat: number; outputVat: number }
  >(
    listVatMonthsInclusive(from, to).map((month) => [
      month.key,
      { year: month.year, month: month.month, inputVat: 0, outputVat: 0 },
    ]),
  );

  for (const expense of expenses) {
    const bucket = byMonth.get(monthKey(expense.issuedAt));

    if (bucket) {
      bucket.inputVat += expense.vatAmount;
    }
  }

  for (const trip of trips) {
    if (!trip.invoicedAt) {
      continue;
    }

    const bucket = byMonth.get(monthKey(trip.invoicedAt));

    if (bucket) {
      bucket.outputVat += trip.invoiceVatAmount ?? 0;
    }
  }

  const monthly = [...byMonth.values()].map((row) => ({
    ...row,
    inputVat: roundMoney(row.inputVat),
    outputVat: roundMoney(row.outputVat),
    balance: roundMoney(row.outputVat - row.inputVat),
  }));
  const totals = monthly.reduce(
    (sum, row) => ({
      inputVat: roundMoney(sum.inputVat + row.inputVat),
      outputVat: roundMoney(sum.outputVat + row.outputVat),
      balance: roundMoney(sum.balance + row.balance),
    }),
    { inputVat: 0, outputVat: 0, balance: 0 },
  );

  return { from, to, totals, monthly };
};

export interface FinanceExportFile {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}

export const exportFinanceReport = async (
  query: FinanceExportQueryRequest,
): Promise<FinanceExportFile> => {
  const { format, ...filters } = query;
  const records = await prisma.financeTransaction.findMany({
    where: transactionListWhere(filters),
    include: transactionInclude,
    orderBy: { occurredAt: 'desc' },
    take: FINANCE_EXPORT_LEDGER_LIMIT + 1,
  });
  const truncated = records.length > FINANCE_EXPORT_LEDGER_LIMIT;
  const ledgerRecords = truncated ? records.slice(0, FINANCE_EXPORT_LEDGER_LIMIT) : records;
  const newest = ledgerRecords[0];
  const oldest = ledgerRecords[ledgerRecords.length - 1];
  const defaults = defaultFinanceReportRange();
  const from = filters.from ?? (oldest ? toIsoDate(oldest.occurredAt) : defaults.from);
  const to = filters.to ?? (newest ? toIsoDate(newest.occurredAt) : defaults.to);
  const report = await getFinanceReport({
    from,
    to,
    paymentMethod: filters.paymentMethod,
  });

  const document = buildFinanceExportDocument({
    report,
    transactions: ledgerRecords.map((record) => toTransactionDto(record)),
    advances: await listUnsettledAdvances({ supplier: filters.supplier }),
    query: filters,
    truncated,
  });

  if (format === 'xlsx') {
    return {
      buffer: buildXlsx(financeExportSheets(document)),
      fileName: `${document.fileStem}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  return {
    buffer: await buildFinanceReportPdf(document),
    fileName: `${document.fileStem}.pdf`,
    mimeType: 'application/pdf',
  };
};
