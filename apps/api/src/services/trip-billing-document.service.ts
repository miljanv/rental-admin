import {
  partnerDisplayName,
  partnerFullAddress,
  type GeneratedTripBillingDocumentResult,
  type TripBillingDocumentDto,
  type TripBillingDocumentType,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { notFound } from '../utils/app-error';
import { toTripBillingDocumentDto, type TripBillingDocumentRecord } from '../utils/trip-billing-document-mapper';
import { logger } from '../utils/logger';
import { buildTripBillingDocumentPdf } from './pdf/trip-billing-document-pdf';
import * as fileService from './file.service';

const documentInclude = { file: true } as const;

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

const startOfYear = (year: number): Date => new Date(Date.UTC(year, 0, 1));
const startOfNextYear = (year: number): Date => new Date(Date.UTC(year + 1, 0, 1));

const NUMBER_PREFIX: Record<TripBillingDocumentType, string> = {
  PREDRACUN: 'PR',
  RACUN: 'RC',
};

const loadTrip = async (tripId: string) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      partner: true,
      vehicles: { include: { vehicle: { select: { licensePlate: true } } } },
    },
  });

  if (!trip) {
    throw notFound('Vožnja nije pronađena.');
  }

  return trip;
};

/** Sequential per document type, reset every calendar year — e.g. PR-2026-0007. */
const nextDocumentNumber = async (type: TripBillingDocumentType, issuedAt: Date): Promise<string> => {
  const year = issuedAt.getUTCFullYear();
  const count = await prisma.tripBillingDocument.count({
    where: { type, issuedAt: { gte: startOfYear(year), lt: startOfNextYear(year) } },
  });

  return `${NUMBER_PREFIX[type]}-${year}-${String(count + 1).padStart(4, '0')}`;
};

export const listTripBillingDocuments = async (tripId: string): Promise<TripBillingDocumentDto[]> => {
  await loadTrip(tripId);

  const records = await prisma.tripBillingDocument.findMany({
    where: { tripId },
    include: documentInclude,
    orderBy: { type: 'asc' },
  });

  return records.map((record: TripBillingDocumentRecord) => toTripBillingDocumentDto(record));
};

/**
 * Regenerating replaces the file in place and keeps the same document
 * number — the point is letting a mistake (wrong price, missing note) be
 * fixed by re-generating, not piling up duplicate Predračun/Račun numbers.
 */
export const generateTripBillingDocument = async (
  tripId: string,
  type: TripBillingDocumentType,
): Promise<GeneratedTripBillingDocumentResult> => {
  const trip = await loadTrip(tripId);
  const existing = await prisma.tripBillingDocument.findFirst({ where: { tripId, type } });

  const issuedAt = new Date();
  const documentNumber = existing?.documentNumber ?? (await nextDocumentNumber(type, issuedAt));

  const clientName = trip.partner ? partnerDisplayName(trip.partner) : (trip.clientName ?? '');
  const clientAddress = trip.partner ? partnerFullAddress(trip.partner) : null;
  const clientTaxId = trip.partner ? (trip.partner.pib ?? trip.partner.personalId) : null;

  const body = await buildTripBillingDocumentPdf({
    type,
    documentNumber,
    issuedAt: toIsoDate(issuedAt),
    clientName,
    clientAddress,
    clientTaxId,
    origin: trip.origin,
    destination: trip.destination,
    departureDate: toIsoDate(trip.departureDate),
    returnDate: trip.returnDate ? toIsoDate(trip.returnDate) : null,
    passengerCount: trip.passengerCount,
    notes: trip.notes,
    vehiclePlates: trip.vehicles.map((assignment) => assignment.vehicle.licensePlate),
    price: trip.price,
    paymentMethod: trip.paymentMethod,
    paidAt: trip.paidAt ? toIsoDate(trip.paidAt) : null,
  });

  const originalName = `${documentNumber} ${clientName || 'bez naručioca'}.pdf`;
  const file = await fileService.storeGeneratedPdf({ originalName, body });

  try {
    let record: TripBillingDocumentRecord;

    if (existing) {
      record = await prisma.tripBillingDocument.update({
        where: { id: existing.id },
        data: { issuedAt, fileId: file.id },
        include: documentInclude,
      });
    } else {
      record = await prisma.tripBillingDocument.create({
        data: { tripId, type, documentNumber, issuedAt, fileId: file.id },
        include: documentInclude,
      });
    }

    if (existing?.fileId && existing.fileId !== file.id) {
      await fileService.deleteFile(existing.fileId).catch(() => undefined);
    }

    const download = await fileService.createDownloadUrl(file.id);
    logger.info('Trip billing document generated', {
      tripId,
      documentId: record.id,
      type,
      replaced: Boolean(existing),
    });

    return {
      document: toTripBillingDocumentDto(record),
      downloadUrl: download.downloadUrl,
      fileName: download.fileName,
      expiresIn: download.expiresIn,
    };
  } catch (error) {
    await fileService.deleteFile(file.id).catch(() => undefined);
    throw error;
  }
};
