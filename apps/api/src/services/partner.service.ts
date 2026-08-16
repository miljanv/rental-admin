import type {
  DeletePartnerResult,
  ListPartnersQuery,
  PaginationMeta,
  PartnerDto,
  PartnerSortField,
  PartnerWriteRequest,
  SortOrder,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { conflict, notFound } from '../utils/app-error';
import { buildPaginationMeta } from '../utils/api-response';
import { logger } from '../utils/logger';
import { toPartnerDto, type PartnerRecord } from '../utils/partner-mapper';

type PartnerOrderBy = Partial<Record<PartnerSortField, SortOrder>>;

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
  const record = await prisma.partner.findUnique({ where: { id } });

  if (!record) {
    throw notFound('Partner nije pronađen.');
  }

  return toPartnerDto(record);
};

export const createPartner = async (input: PartnerWriteRequest): Promise<PartnerDto> => {
  const record = await prisma.partner.create({ data: toWriteData(input) });
  logger.info('Partner created', { partnerId: record.id, type: record.type });

  return toPartnerDto(record);
};

export const updatePartner = async (id: string, input: PartnerWriteRequest): Promise<PartnerDto> => {
  await getPartner(id);

  const record = await prisma.partner.update({ where: { id }, data: toWriteData(input) });
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
