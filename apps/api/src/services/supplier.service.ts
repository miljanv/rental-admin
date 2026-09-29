import type {
  DeleteSupplierResult,
  ListSuppliersQuery,
  PaginationMeta,
  SortOrder,
  SupplierDto,
  SupplierSortField,
  SupplierWriteRequest,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { buildPaginationMeta } from '../utils/api-response';
import { conflict, notFound } from '../utils/app-error';
import { logger } from '../utils/logger';
import { toSupplierDto, type SupplierRecord } from '../utils/supplier-mapper';

type SupplierOrderBy = Partial<Record<SupplierSortField, SortOrder>>;

const supplierInclude = {
  bankAccounts: {
    select: { id: true, accountNumber: true },
    orderBy: { accountNumber: 'asc' as const },
  },
} as const;

const toWriteData = (input: SupplierWriteRequest) => ({
  name: input.name,
  email: input.email,
  phone: input.phone,
  pib: input.pib,
  registrationNumber: input.registrationNumber,
  address: input.address,
  city: input.city,
  contactPerson: input.contactPerson,
  note: input.note,
});

const normalizeBankAccount = (value: string | null | undefined): string | null => {
  const normalized = value?.replace(/\s+/g, '').trim() ?? '';
  return normalized.length > 0 ? normalized : null;
};

const isUniqueConstraint = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  return (error as { code: unknown }).code === 'P2002';
};

export const mergeSupplierNames = (names: string[]): string[] =>
  [...new Set(names.map((name) => name.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, 'sr'),
  );

export const listSupplierNames = async (): Promise<string[]> => {
  const rows = await prisma.supplier.findMany({
    select: { name: true },
    orderBy: { name: 'asc' },
  });

  return rows.map((row) => row.name);
};

const normalizeMatchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'DJ')
    .replace(/đ/g, 'dj')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');

export const findSupplierIdByName = async (
  name: string | null | undefined,
): Promise<string | null> => {
  const normalized = name?.trim();

  if (!normalized) {
    return null;
  }

  const record = await prisma.supplier.findFirst({
    where: { name: { equals: normalized, mode: 'insensitive' } },
    select: { id: true },
  });

  if (record) {
    return record.id;
  }

  const normalizedInput = normalizeMatchText(normalized);
  const suppliers = await prisma.supplier.findMany({ select: { id: true, name: true } });
  const fuzzy = suppliers.find((supplier) => {
    const normalizedSupplier = normalizeMatchText(supplier.name);

    return (
      normalizedSupplier.length >= 3 &&
      (normalizedInput.includes(normalizedSupplier) || normalizedSupplier.includes(normalizedInput))
    );
  });

  return fuzzy?.id ?? null;
};

export const findSupplierByBankAccount = async (
  accountNumber: string | null | undefined,
): Promise<{ id: string; name: string } | null> => {
  const normalized = normalizeBankAccount(accountNumber);

  if (!normalized) {
    return null;
  }

  const account = await prisma.supplierBankAccount.findUnique({
    where: { accountNumber: normalized },
    include: { supplier: { select: { id: true, name: true } } },
  });

  return account?.supplier ?? null;
};

export const rememberSupplierBankAccount = async (
  supplierId: string,
  accountNumber: string | null | undefined,
): Promise<void> => {
  const normalized = normalizeBankAccount(accountNumber);

  if (!normalized) {
    return;
  }

  await prisma.supplierBankAccount
    .create({ data: { supplierId, accountNumber: normalized } })
    .catch(() => null);
};

export const listSuppliers = async (
  query: ListSuppliersQuery,
): Promise<{ suppliers: SupplierDto[]; pagination: PaginationMeta }> => {
  const orderBy: SupplierOrderBy = { [query.sortBy]: query.sortOrder };
  const where = query.search
    ? {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' as const } },
          { email: { contains: query.search, mode: 'insensitive' as const } },
          { phone: { contains: query.search, mode: 'insensitive' as const } },
          { pib: { contains: query.search } },
          { registrationNumber: { contains: query.search } },
          { city: { contains: query.search, mode: 'insensitive' as const } },
          { contactPerson: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [total, records] = await Promise.all([
    prisma.supplier.count({ where }),
    prisma.supplier.findMany({
      where,
      include: supplierInclude,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    suppliers: records.map((record: SupplierRecord) => toSupplierDto(record)),
    pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
  };
};

export const getSupplier = async (id: string): Promise<SupplierDto> => {
  const record = await prisma.supplier.findUnique({ where: { id }, include: supplierInclude });

  if (!record) {
    throw notFound('Dobavljač nije pronađen.');
  }

  return toSupplierDto(record);
};

export const createSupplier = async (input: SupplierWriteRequest): Promise<SupplierDto> => {
  try {
    const record = await prisma.supplier.create({
      data: {
        ...toWriteData(input),
        bankAccounts: {
          create: input.bankAccounts.map((account) => ({
            accountNumber: account.accountNumber,
          })),
        },
      },
      include: supplierInclude,
    });
    logger.info('Supplier created', { supplierId: record.id });

    return toSupplierDto(record);
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw conflict('Dobavljač sa tim nazivom ili PIB-om već postoji.');
    }

    throw error;
  }
};

export const updateSupplier = async (
  id: string,
  input: SupplierWriteRequest,
): Promise<SupplierDto> => {
  await getSupplier(id);

  try {
    const record = await prisma.$transaction(async (tx) => {
      await tx.supplierBankAccount.deleteMany({ where: { supplierId: id } });

      return tx.supplier.update({
        where: { id },
        data: {
          ...toWriteData(input),
          bankAccounts: {
            create: input.bankAccounts.map((account) => ({
              accountNumber: account.accountNumber,
            })),
          },
        },
        include: supplierInclude,
      });
    });
    logger.info('Supplier updated', { supplierId: record.id });

    return toSupplierDto(record);
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw conflict('Dobavljač sa tim nazivom ili PIB-om već postoji.');
    }

    throw error;
  }
};

export const deleteSupplier = async (id: string): Promise<DeleteSupplierResult> => {
  await getSupplier(id);

  await prisma.supplier.delete({ where: { id } });
  logger.info('Supplier deleted', { supplierId: id });

  return { id, deleted: true };
};
