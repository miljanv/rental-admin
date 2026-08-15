import type {
  DeletePassengerListResult,
  DeletePassengerResult,
  PassengerDto,
  PassengerListDto,
  PassengerListWriteRequest,
  PassengerWriteRequest,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { conflict, notFound } from '../utils/app-error';
import { logger } from '../utils/logger';
import {
  toPassengerDto,
  toPassengerListDto,
  type PassengerListRecord,
} from '../utils/passenger-list-mapper';

const passengersOrderBy = { lastName: 'asc' as const };

const assertContractExists = async (contractId: string): Promise<void> => {
  const contract = await prisma.contract.findUnique({ where: { id: contractId }, select: { id: true } });

  if (!contract) {
    throw notFound('Ugovor nije pronađen.');
  }
};

const loadPassengerList = async (contractId: string, listId: string) => {
  const list = await prisma.passengerList.findFirst({ where: { id: listId, contractId } });

  if (!list) {
    throw notFound('Spisak putnika nije pronađen.');
  }

  return list;
};

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 'P2002';

export const listPassengerLists = async (contractId: string): Promise<PassengerListDto[]> => {
  await assertContractExists(contractId);

  const records = await prisma.passengerList.findMany({
    where: { contractId },
    include: { passengers: { orderBy: passengersOrderBy } },
    orderBy: { type: 'asc' },
  });

  return records.map((record: PassengerListRecord) => toPassengerListDto(record));
};

export const createPassengerList = async (
  contractId: string,
  input: PassengerListWriteRequest,
): Promise<PassengerListDto> => {
  await assertContractExists(contractId);

  try {
    const record = await prisma.passengerList.create({
      data: { contractId, type: input.type },
      include: { passengers: { orderBy: passengersOrderBy } },
    });

    logger.info('Passenger list created', { contractId, listId: record.id, type: record.type });

    return toPassengerListDto(record);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('Spisak ovog tipa već postoji za ovaj ugovor.');
    }

    throw error;
  }
};

export const deletePassengerList = async (
  contractId: string,
  listId: string,
): Promise<DeletePassengerListResult> => {
  await loadPassengerList(contractId, listId);

  await prisma.passengerList.delete({ where: { id: listId } });
  logger.info('Passenger list deleted', { contractId, listId });

  return { id: listId, deleted: true };
};

export const addPassenger = async (
  contractId: string,
  listId: string,
  input: PassengerWriteRequest,
): Promise<PassengerDto> => {
  await loadPassengerList(contractId, listId);

  const record = await prisma.passenger.create({ data: { passengerListId: listId, ...input } });
  logger.info('Passenger added', { contractId, listId, passengerId: record.id });

  return toPassengerDto(record);
};

export const updatePassenger = async (
  contractId: string,
  listId: string,
  passengerId: string,
  input: PassengerWriteRequest,
): Promise<PassengerDto> => {
  await loadPassengerList(contractId, listId);

  const existing = await prisma.passenger.findFirst({ where: { id: passengerId, passengerListId: listId } });

  if (!existing) {
    throw notFound('Putnik nije pronađen.');
  }

  const record = await prisma.passenger.update({ where: { id: passengerId }, data: input });
  logger.info('Passenger updated', { contractId, listId, passengerId });

  return toPassengerDto(record);
};

export const deletePassenger = async (
  contractId: string,
  listId: string,
  passengerId: string,
): Promise<DeletePassengerResult> => {
  await loadPassengerList(contractId, listId);

  const existing = await prisma.passenger.findFirst({ where: { id: passengerId, passengerListId: listId } });

  if (!existing) {
    throw notFound('Putnik nije pronađen.');
  }

  await prisma.passenger.delete({ where: { id: passengerId } });
  logger.info('Passenger deleted', { contractId, listId, passengerId });

  return { id: passengerId, deleted: true };
};
