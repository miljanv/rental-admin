import type {
  DeletePartnerResult,
  ListPartnersQuery,
  PaginationMeta,
  PartnerDto,
  PartnerLedgerDto,
  PartnerLedgerEntryDto,
  PartnerLedgerQuery,
  PartnerSortField,
  PartnerWriteRequest,
  SortOrder,
} from '@rental-admin/shared';
import { partnerSelectLabel } from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { conflict, notFound } from '../utils/app-error';
import { buildPaginationMeta } from '../utils/api-response';
import { logger } from '../utils/logger';
import { toPartnerDto, type PartnerRecord } from '../utils/partner-mapper';

type PartnerOrderBy = Partial<Record<PartnerSortField, SortOrder>>;

const partnerInclude = {
  bankAccounts: {
    select: { id: true, accountNumber: true },
    orderBy: { accountNumber: 'asc' as const },
  },
} as const;

const toWriteData = (input: PartnerWriteRequest) => ({
  type: input.type,
  companyName: input.companyName,
  firstName: input.firstName,
  lastName: input.lastName,
  address: input.address,
  city: input.city,
  nickname: input.nickname,
  pib: input.pib,
  registrationNumber: input.registrationNumber,
  personalId: input.personalId,
});

const MONEY_EPSILON = 0.005;

const parseDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const normalizeMatchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'DJ')
    .replace(/đ/g, 'dj')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');

const partnerMatchNames = (partner: PartnerDto): string[] =>
  [
    partnerSelectLabel(partner),
    partner.companyName,
    partner.nickname,
    `${partner.firstName ?? ''} ${partner.lastName ?? ''}`.trim(),
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim());

const matchesPartnerText = (value: string | null, partnerNames: string[]): boolean => {
  if (!value?.trim()) {
    return false;
  }

  const normalizedValue = normalizeMatchText(value);

  return partnerNames.some((name) => {
    const normalizedName = normalizeMatchText(name);

    return (
      normalizedName.length >= 5 &&
      (normalizedValue.includes(normalizedName) || normalizedName.includes(normalizedValue))
    );
  });
};

const dateInRange = (date: string, query: PartnerLedgerQuery): boolean =>
  (!query.from || date >= query.from) && (!query.to || date <= query.to);

const dateBeforeRange = (date: string, query: PartnerLedgerQuery): boolean =>
  Boolean(query.from && date < query.from);

const daysOverdue = (dueDate: string | null, now = new Date()): number | null => {
  if (!dueDate) {
    return null;
  }

  const due = parseDate(dueDate);
  const today = parseDate(toIsoDate(now));
  const days = Math.floor((today.getTime() - due.getTime()) / 86_400_000);

  return days > 0 ? days : 0;
};

const isForeignKeyRestriction = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  return (error as { code: unknown }).code === 'P2003';
};

export const listPartners = async (
  query: ListPartnersQuery,
): Promise<{ partners: PartnerDto[]; pagination: PaginationMeta }> => {
  const orderBy: PartnerOrderBy = { [query.sortBy]: query.sortOrder };

  const where = {
    ...(query.type ? { type: query.type } : {}),
    ...(query.search
      ? {
          OR: [
            { companyName: { contains: query.search, mode: 'insensitive' as const } },
            { firstName: { contains: query.search, mode: 'insensitive' as const } },
            { lastName: { contains: query.search, mode: 'insensitive' as const } },
            { nickname: { contains: query.search, mode: 'insensitive' as const } },
            { pib: { contains: query.search } },
            { registrationNumber: { contains: query.search } },
            { personalId: { contains: query.search } },
          ],
        }
      : {}),
  };

  const [total, records] = await Promise.all([
    prisma.partner.count({ where }),
    prisma.partner.findMany({
      where,
      include: partnerInclude,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    partners: records.map((record: PartnerRecord) => toPartnerDto(record)),
    pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
  };
};

export const getPartner = async (id: string): Promise<PartnerDto> => {
  const record = await prisma.partner.findUnique({ where: { id }, include: partnerInclude });

  if (!record) {
    throw notFound('Partner nije pronađen.');
  }

  return toPartnerDto(record);
};

type InvoiceLedgerDraft = Omit<PartnerLedgerEntryDto, 'balance'> & {
  sortDate: string;
  targetType: 'TRIP_INVOICE' | 'TRIP_SERIES_INVOICE';
  targetId: string;
};

type PaymentLedgerDraft = Omit<PartnerLedgerEntryDto, 'balance'> & {
  sortDate: string;
};

const invoiceTargetKey = (targetType: 'TRIP_INVOICE' | 'TRIP_SERIES_INVOICE', targetId: string) =>
  `${targetType}:${targetId}`;

const tripInvoiceDescription = (trip: {
  invoiceDescription: string | null;
  origin: string;
  destination: string;
}): string => trip.invoiceDescription?.trim() || `${trip.origin} - ${trip.destination}`;

export const getPartnerLedger = async (
  id: string,
  query: PartnerLedgerQuery,
): Promise<PartnerLedgerDto> => {
  const partner = await getPartner(id);
  const partnerNames = partnerMatchNames(partner);
  const toDate = query.to ? parseDate(query.to) : undefined;

  const legacyClientMatches = partnerNames.map((name) => ({
    partnerId: null,
    clientName: { contains: name, mode: 'insensitive' as const },
  }));

  const trips = await prisma.trip.findMany({
    where: {
      invoicedAt: {
        not: null,
        ...(toDate ? { lte: toDate } : {}),
      },
      OR: [{ partnerId: id }, ...legacyClientMatches],
    },
    select: {
      id: true,
      referenceNumber: true,
      departureDate: true,
      origin: true,
      destination: true,
      price: true,
      invoicedAt: true,
      invoiceDescription: true,
      invoiceGrossAmount: true,
      invoiceGroupId: true,
    },
    orderBy: [{ invoicedAt: 'asc' }, { departureDate: 'asc' }],
  });

  const groupedTrips = new Map<string, typeof trips>();
  const standaloneTrips: typeof trips = [];

  for (const trip of trips) {
    if (trip.invoiceGroupId) {
      const group = groupedTrips.get(trip.invoiceGroupId) ?? [];
      group.push(trip);
      groupedTrips.set(trip.invoiceGroupId, group);
    } else {
      standaloneTrips.push(trip);
    }
  }

  const invoiceDrafts: InvoiceLedgerDraft[] = standaloneTrips
    .map((trip): InvoiceLedgerDraft | null => {
      if (!trip.invoicedAt) {
        return null;
      }

      const postedAt = toIsoDate(trip.invoicedAt);
      const amount = trip.invoiceGrossAmount ?? trip.price ?? 0;

      if (amount <= MONEY_EPSILON) {
        return null;
      }

      return {
        id: `invoice:${trip.id}`,
        type: 'INVOICE',
        postedAt,
        sortDate: postedAt,
        documentType: 'Faktura',
        documentNumber: trip.referenceNumber,
        externalDocumentNumber: null,
        description: tripInvoiceDescription(trip),
        dueDate: null,
        remainingAmount: amount,
        daysOverdue: null,
        debit: amount,
        credit: 0,
        sourceType: 'TRIP_INVOICE',
        sourceId: trip.id,
        targetType: 'TRIP_INVOICE',
        targetId: trip.id,
      };
    })
    .filter((entry): entry is InvoiceLedgerDraft => Boolean(entry));

  for (const [groupId, group] of groupedTrips.entries()) {
    const first = group[0];

    if (!first?.invoicedAt) {
      continue;
    }

    const postedAt = toIsoDate(first.invoicedAt);
    const amount = roundMoney(
      group.reduce((sum, trip) => sum + (trip.invoiceGrossAmount ?? trip.price ?? 0), 0),
    );

    if (amount <= MONEY_EPSILON) {
      continue;
    }

    invoiceDrafts.push({
      id: `series-invoice:${groupId}`,
      type: 'INVOICE',
      postedAt,
      sortDate: postedAt,
      documentType: 'Faktura serije',
      documentNumber: first.referenceNumber,
      externalDocumentNumber: null,
      description: first.invoiceDescription?.trim()
        ? `${first.invoiceDescription.trim()} · ${group.length} vožnji`
        : `${first.origin} - ${first.destination} · ${group.length} vožnji`,
      dueDate: null,
      remainingAmount: amount,
      daysOverdue: null,
      debit: amount,
      credit: 0,
      sourceType: 'TRIP_SERIES_INVOICE',
      sourceId: groupId,
      targetType: 'TRIP_SERIES_INVOICE',
      targetId: groupId,
    });
  }

  const targetKeys = new Set(invoiceDrafts.map((invoice) => invoiceTargetKey(invoice.targetType, invoice.targetId)));
  const targetFilters = [...targetKeys].map((key) => {
    const [targetType, targetId] = key.split(':') as [
      'TRIP_INVOICE' | 'TRIP_SERIES_INVOICE',
      string,
    ];

    return { targetType, targetId };
  });

  const allocations =
    targetFilters.length > 0
      ? await prisma.paymentAllocation.findMany({
          where: { OR: targetFilters },
          include: {
            transaction: {
              select: {
                id: true,
                occurredAt: true,
              },
            },
          },
        })
      : [];

  const allocationsByTransaction = new Map<string, typeof allocations>();
  const allocatedByTarget = new Map<string, number>();

  for (const allocation of allocations) {
    const transactionDate = toIsoDate(allocation.transaction.occurredAt);
    const countsForPeriodEnd = !query.to || transactionDate <= query.to;
    const key = invoiceTargetKey(
      allocation.targetType as 'TRIP_INVOICE' | 'TRIP_SERIES_INVOICE',
      allocation.targetId,
    );

    if (countsForPeriodEnd) {
      allocatedByTarget.set(key, (allocatedByTarget.get(key) ?? 0) + allocation.amount);
    }

    const group = allocationsByTransaction.get(allocation.transactionId) ?? [];
    group.push(allocation);
    allocationsByTransaction.set(allocation.transactionId, group);
  }

  const targetLabelByKey = new Map(
    invoiceDrafts.map((invoice) => [
      invoiceTargetKey(invoice.targetType, invoice.targetId),
      invoice.documentNumber ?? invoice.description,
    ]),
  );

  const allocationTransactionIds = [...allocationsByTransaction.keys()];
  const legacyPartnerMatches = partnerNames.map((name) => ({
    partnerId: null,
    partner: { contains: name, mode: 'insensitive' as const },
  }));

  const paymentOr = [
    { partnerId: id },
    ...legacyPartnerMatches,
    ...(allocationTransactionIds.length > 0 ? [{ id: { in: allocationTransactionIds } }] : []),
  ];

  const payments = await prisma.financeTransaction.findMany({
    where: {
      type: 'INCOME',
      occurredAt: {
        ...(toDate ? { lte: toDate } : {}),
      },
      sourceType: { in: ['MANUAL', 'BANK_STATEMENT'] },
      OR: paymentOr,
    },
    select: {
      id: true,
      amount: true,
      occurredAt: true,
      note: true,
      partner: true,
      partnerId: true,
      sourceType: true,
      sourceId: true,
      statementNumber: true,
      bankReference: true,
    },
    orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }],
  });

  for (const invoice of invoiceDrafts) {
    const allocatedAmount = allocatedByTarget.get(invoiceTargetKey(invoice.targetType, invoice.targetId)) ?? 0;
    invoice.remainingAmount = Math.max(0, roundMoney(invoice.debit - allocatedAmount));
    invoice.daysOverdue = daysOverdue(invoice.dueDate);
  }

  const paymentDrafts: PaymentLedgerDraft[] = payments
    .map((payment): PaymentLedgerDraft | null => {
      const postedAt = toIsoDate(payment.occurredAt);
      const allocationsForPayment = allocationsByTransaction.get(payment.id) ?? [];
      const allocationCredit = roundMoney(
        allocationsForPayment.reduce((sum, allocation) => {
          const key = invoiceTargetKey(
            allocation.targetType as 'TRIP_INVOICE' | 'TRIP_SERIES_INVOICE',
            allocation.targetId,
          );

          return targetKeys.has(key) ? sum + allocation.amount : sum;
        }, 0),
      );
      const matchedByPartner =
        payment.partnerId === id || matchesPartnerText(payment.partner, partnerNames);
      const credit = matchedByPartner ? payment.amount : allocationCredit;

      if (credit <= MONEY_EPSILON) {
        return null;
      }

      const linkedDocuments = [
        ...new Set(
          allocationsForPayment
            .map((allocation) =>
              targetLabelByKey.get(
                invoiceTargetKey(
                  allocation.targetType as 'TRIP_INVOICE' | 'TRIP_SERIES_INVOICE',
                  allocation.targetId,
                ),
              ),
            )
            .filter((value): value is string => Boolean(value)),
        ),
      ];

      return {
        id: `payment:${payment.id}`,
        type: 'PAYMENT',
        postedAt,
        sortDate: postedAt,
        documentType: payment.sourceType === 'BANK_STATEMENT' ? 'Uplata iz izvoda' : 'Uplata',
        documentNumber: payment.statementNumber ?? payment.bankReference ?? null,
        externalDocumentNumber: linkedDocuments.length > 0 ? linkedDocuments.join(', ') : null,
        description: payment.note?.trim() || payment.partner?.trim() || partnerSelectLabel(partner),
        dueDate: null,
        remainingAmount: null,
        daysOverdue: null,
        debit: 0,
        credit,
        sourceType: 'FINANCE_TRANSACTION',
        sourceId: payment.id,
      };
    })
    .filter((entry): entry is PaymentLedgerDraft => Boolean(entry));

  const allDrafts = [...invoiceDrafts, ...paymentDrafts];
  const openingDrafts = allDrafts.filter((entry) => dateBeforeRange(entry.postedAt, query));
  const periodDrafts = allDrafts
    .filter((entry) => dateInRange(entry.postedAt, query))
    .sort((left, right) => {
      const dateCompare = left.sortDate.localeCompare(right.sortDate);

      if (dateCompare !== 0) {
        return dateCompare;
      }

      const leftPriority = left.type === 'INVOICE' ? 0 : 1;
      const rightPriority = right.type === 'INVOICE' ? 0 : 1;

      return leftPriority - rightPriority || left.id.localeCompare(right.id);
    });

  const openingDebit = roundMoney(openingDrafts.reduce((sum, entry) => sum + entry.debit, 0));
  const openingCredit = roundMoney(openingDrafts.reduce((sum, entry) => sum + entry.credit, 0));
  let runningBalance = roundMoney(openingDebit - openingCredit);

  const entries = periodDrafts.map((entry): PartnerLedgerEntryDto => {
    runningBalance = roundMoney(runningBalance + entry.debit - entry.credit);
    const dto = (() => {
      if ('targetType' in entry && 'targetId' in entry) {
        const { sortDate: _sortDate, targetType: _targetType, targetId: _targetId, ...rest } = entry;
        return rest;
      }

      const { sortDate: _sortDate, ...rest } = entry;
      return rest;
    })();

    return { ...dto, balance: runningBalance };
  });

  const periodDebit = roundMoney(periodDrafts.reduce((sum, entry) => sum + entry.debit, 0));
  const periodCredit = roundMoney(periodDrafts.reduce((sum, entry) => sum + entry.credit, 0));
  const endingDebit = roundMoney(openingDebit + periodDebit);
  const endingCredit = roundMoney(openingCredit + periodCredit);

  return {
    partner,
    from: query.from ?? null,
    to: query.to ?? null,
    entries,
    summary: {
      openingDebit,
      openingCredit,
      openingBalance: roundMoney(openingDebit - openingCredit),
      periodDebit,
      periodCredit,
      endingDebit,
      endingCredit,
      endingBalance: roundMoney(endingDebit - endingCredit),
    },
  };
};

export const createPartner = async (input: PartnerWriteRequest): Promise<PartnerDto> => {
  const record = await prisma.partner.create({
    data: {
      ...toWriteData(input),
      bankAccounts: {
        create: input.bankAccounts.map((account) => ({
          accountNumber: account.accountNumber,
        })),
      },
    },
    include: partnerInclude,
  });
  logger.info('Partner created', { partnerId: record.id, type: record.type });

  return toPartnerDto(record);
};

export const updatePartner = async (
  id: string,
  input: PartnerWriteRequest,
): Promise<PartnerDto> => {
  await getPartner(id);

  const record = await prisma.$transaction(async (tx) => {
    await tx.partnerBankAccount.deleteMany({ where: { partnerId: id } });

    return tx.partner.update({
      where: { id },
      data: {
        ...toWriteData(input),
        bankAccounts: {
          create: input.bankAccounts.map((account) => ({
            accountNumber: account.accountNumber,
          })),
        },
      },
      include: partnerInclude,
    });
  });
  logger.info('Partner updated', { partnerId: record.id });

  return toPartnerDto(record);
};

export const deletePartner = async (id: string): Promise<DeletePartnerResult> => {
  await getPartner(id);

  try {
    await prisma.partner.delete({ where: { id } });
  } catch (error) {
    if (isForeignKeyRestriction(error)) {
      throw conflict('Partner ima povezane ugovore i ne može se obrisati.');
    }

    throw error;
  }

  logger.info('Partner deleted', { partnerId: id });

  return { id, deleted: true };
};
