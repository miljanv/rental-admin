import type {
  ContractAvailabilityQuery,
  ContractAvailabilityResult,
  ContractDto,
  ContractSortField,
  ContractStatusChangeRequest,
  ContractWriteRequest,
  DeleteContractResult,
  ListContractsQuery,
  PaginationMeta,
  SortOrder,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { badRequest, conflict, notFound } from '../utils/app-error';
import { buildPaginationMeta } from '../utils/api-response';
import { toContractDto, type ContractRecord } from '../utils/contract-mapper';
import { logger } from '../utils/logger';
import { deleteAttachedFile } from './file-attachment.service';

/** Contracts in these statuses don't hold a real claim on the vehicle/driver's calendar. */
const NON_BLOCKING_STATUSES = ['CANCELLED'] as const;

type ContractOrderBy = Partial<Record<ContractSortField, SortOrder>>;

const parseIsoDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

const toWriteData = (input: ContractWriteRequest) => ({
  partnerId: input.partnerId,
  vehicleId: input.vehicleId,
  driverId: input.driverId,
  conclusionDate: parseIsoDate(input.conclusionDate),
  origin: input.origin,
  destination: input.destination,
  serviceStartDate: parseIsoDate(input.serviceStartDate),
  serviceEndDate: parseIsoDate(input.serviceEndDate),
  passengerCount: input.passengerCount,
  price: input.price,
  advancePercentage: input.advancePercentage,
  status: input.status,
  notes: input.notes,
  isInternational: input.isInternational,
  clientType: input.clientType,
  clientCompanyName: input.clientCompanyName,
  clientFirstName: input.clientFirstName,
  clientLastName: input.clientLastName,
  clientAddress: input.clientAddress,
  clientPib: input.clientPib,
  clientRegistrationNumber: input.clientRegistrationNumber,
  clientPersonalId: input.clientPersonalId,
});

/** Contract references Partner/Vehicle/Driver as plain string ids (no nested route param already validates
 * the parent), so each referenced id is checked up front and reported with a field-specific message rather
 * than surfacing an opaque foreign-key-violation error from Postgres. */
const assertReferencesExist = async (input: ContractWriteRequest): Promise<void> => {
  const partner = await prisma.partner.findUnique({ where: { id: input.partnerId }, select: { id: true } });
  if (!partner) {
    throw badRequest('Izabrani partner ne postoji.');
  }

  if (input.vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId }, select: { id: true } });
    if (!vehicle) {
      throw badRequest('Izabrano vozilo ne postoji.');
    }
  }

  if (input.driverId) {
    const driver = await prisma.driver.findUnique({ where: { id: input.driverId }, select: { id: true } });
    if (!driver) {
      throw badRequest('Izabrani vozač ne postoji.');
    }
  }
};

export const listContracts = async (
  query: ListContractsQuery,
): Promise<{ contracts: ContractDto[]; pagination: PaginationMeta }> => {
  const orderBy: ContractOrderBy = { [query.sortBy]: query.sortOrder };

  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.partnerId ? { partnerId: query.partnerId } : {}),
    // Overlap test: the contract's service period intersects [periodFrom, periodTo].
    ...(query.periodFrom ? { serviceEndDate: { gte: parseIsoDate(query.periodFrom) } } : {}),
    ...(query.periodTo ? { serviceStartDate: { lte: parseIsoDate(query.periodTo) } } : {}),
    ...(query.search
      ? {
          OR: [
            { origin: { contains: query.search, mode: 'insensitive' as const } },
            { destination: { contains: query.search, mode: 'insensitive' as const } },
            { clientCompanyName: { contains: query.search, mode: 'insensitive' as const } },
            { clientFirstName: { contains: query.search, mode: 'insensitive' as const } },
            { clientLastName: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, records] = await Promise.all([
    prisma.contract.count({ where }),
    prisma.contract.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    contracts: records.map((record: ContractRecord) => toContractDto(record)),
    pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
  };
};

export const getContract = async (id: string): Promise<ContractDto> => {
  const record = await prisma.contract.findUnique({ where: { id } });

  if (!record) {
    throw notFound('Ugovor nije pronađen.');
  }

  return toContractDto(record);
};

export const createContract = async (input: ContractWriteRequest): Promise<ContractDto> => {
  await assertReferencesExist(input);

  const record = await prisma.contract.create({ data: toWriteData(input) });
  logger.info('Contract created', { contractId: record.id, partnerId: record.partnerId });

  return toContractDto(record);
};

export const updateContract = async (
  id: string,
  input: ContractWriteRequest,
): Promise<ContractDto> => {
  await getContract(id);
  await assertReferencesExist(input);

  const record = await prisma.contract.update({ where: { id }, data: toWriteData(input) });
  logger.info('Contract updated', { contractId: record.id });

  return toContractDto(record);
};

export const changeContractStatus = async (
  id: string,
  input: ContractStatusChangeRequest,
): Promise<ContractDto> => {
  const existing = await prisma.contract.findUnique({ where: { id } });

  if (!existing) {
    throw notFound('Ugovor nije pronađen.');
  }

  if (input.status === 'IN_PROGRESS' && existing.isInternational) {
    const permitCount = await prisma.travelPermit.count({ where: { contractId: id } });

    if (permitCount === 0) {
      throw conflict(
        'Ugovor ide u inostranstvo i nema nijednu unetu putnu dozvolu. Dodajte dozvolu pre nego što ugovor označite kao "u toku".',
      );
    }
  }

  const record = await prisma.contract.update({ where: { id }, data: { status: input.status } });
  logger.info('Contract status changed', { contractId: id, status: input.status });

  return toContractDto(record);
};

export const checkContractAvailability = async (
  query: ContractAvailabilityQuery,
): Promise<ContractAvailabilityResult> => {
  const overlap = {
    serviceStartDate: { lte: parseIsoDate(query.serviceEndDate) },
    serviceEndDate: { gte: parseIsoDate(query.serviceStartDate) },
    status: { notIn: [...NON_BLOCKING_STATUSES] },
    ...(query.excludeContractId ? { id: { not: query.excludeContractId } } : {}),
  };

  const [vehicleConflicts, driverConflicts] = await Promise.all([
    query.vehicleId
      ? prisma.contract.findMany({ where: { ...overlap, vehicleId: query.vehicleId } })
      : Promise.resolve([]),
    query.driverId
      ? prisma.contract.findMany({ where: { ...overlap, driverId: query.driverId } })
      : Promise.resolve([]),
  ]);

  return {
    vehicleConflicts: vehicleConflicts.map((record: ContractRecord) => toContractDto(record)),
    driverConflicts: driverConflicts.map((record: ContractRecord) => toContractDto(record)),
  };
};

export const deleteContract = async (id: string): Promise<DeleteContractResult> => {
  await getContract(id);

  // Generated PDFs and travel-permit scans live in S3, not Postgres — cascade
  // removes the ContractDocument/TravelPermit rows but can't reach into the
  // bucket, so the underlying files are deleted first. PassengerList rows
  // carry no files, so they need no explicit cleanup before the cascade.
  const [documents, permits] = await Promise.all([
    prisma.contractDocument.findMany({ where: { contractId: id }, select: { fileId: true } }),
    prisma.travelPermit.findMany({ where: { contractId: id }, select: { fileId: true } }),
  ]);

  for (const document of documents) {
    await deleteAttachedFile(document.fileId);
  }

  for (const permit of permits) {
    await deleteAttachedFile(permit.fileId);
  }

  await prisma.contract.delete({ where: { id } });
  logger.info('Contract deleted', { contractId: id });

  return { id, deleted: true };
};
