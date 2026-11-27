import type {
  DriverFuelEntryCreateRequest,
  DriverFuelEntryDto,
  DriverFuelEntryListQuery,
  DriverFuelEntryReviewRequest,
  DriverPortalToolCreateRequest,
  DriverPortalVehicleOptionDto,
  DriverToolAttentionDto,
  DriverToolDto,
  DriverToolLostRequest,
  DriverToolOfficeActionRequest,
  DriverToolRespondRequest,
  DriverToolWriteRequest,
  DriverWorkplacePendingDto,
  VehicleFaultCreateRequest,
  VehicleFaultDto,
  VehicleFaultListQuery,
  VehicleFaultUpdateRequest,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { badRequest, conflict, notFound } from '../utils/app-error';
import { logger } from '../utils/logger';
import { requireOrganizationId } from '../utils/tenant-context';
import { recordAuditEvent } from './audit.service';
import { assertReceipt, lastKnownOdometerKm, portalTodayIso } from './driver-portal.service';
import { createFuelLog } from './fuel-log.service';

const parseDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);
const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);
const personName = (person: { firstName: string; lastName: string }): string =>
  `${person.firstName} ${person.lastName}`.trim();

const vehicleSelect = { id: true, licensePlate: true, make: true, model: true } as const;
const fileSelect = { id: true, originalName: true } as const;

/** Vehicle and driver ids come from request bodies, so they are looked up in the firm first. */
const assertVehicle = async (vehicleId: string): Promise<void> => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { isEnabled: true },
  });

  if (!vehicle || !vehicle.isEnabled) {
    throw badRequest('Vozilo nije pronađeno.');
  }
};

const assertDriver = async (driverId: string): Promise<void> => {
  const driver = await prisma.driver.findUnique({ where: { id: driverId }, select: { id: true } });

  if (!driver) {
    throw notFound('Vozač nije pronađen.');
  }
};

const kmFormatter = new Intl.NumberFormat('sr-RS', { maximumFractionDigits: 1 });

/** The odometer only goes up: refuse a reading below what the vehicle showed before that day. */
const assertOdometerNotBelowKnown = async (
  vehicleId: string,
  isoDate: string,
  odometerKm: number,
): Promise<void> => {
  const floor = await lastKnownOdometerKm(vehicleId, null, parseDate(isoDate), false);

  if (floor !== null && odometerKm < floor) {
    throw badRequest(
      `Kilometraža ne može biti manja od trenutne (${kmFormatter.format(floor)} km).`,
    );
  }
};

/** Enabled vehicles of the firm, for the portal's pickers. */
export const listPortalVehicles = async (): Promise<DriverPortalVehicleOptionDto[]> =>
  prisma.vehicle.findMany({
    where: { isEnabled: true },
    select: vehicleSelect,
    orderBy: { licensePlate: 'asc' },
  });

// ---------------------------------------------------------------------------
// Faults
// ---------------------------------------------------------------------------

const faultInclude = {
  vehicle: { select: vehicleSelect },
  driver: { select: { id: true, firstName: true, lastName: true } },
  file: { select: fileSelect },
} as const;

type FaultRecord = {
  id: string;
  reportedAt: Date;
  odometerKm: number;
  description: string;
  status: VehicleFaultDto['status'];
  officeNote: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  vehicle: DriverPortalVehicleOptionDto;
  driver: { id: string; firstName: string; lastName: string } | null;
  file: { id: string; originalName: string } | null;
};

export const toVehicleFaultDto = (record: FaultRecord): VehicleFaultDto => ({
  id: record.id,
  vehicle: record.vehicle,
  driver: record.driver ? { id: record.driver.id, name: personName(record.driver) } : null,
  reportedAt: toIsoDate(record.reportedAt),
  odometerKm: record.odometerKm,
  description: record.description,
  file: record.file,
  status: record.status,
  officeNote: record.officeNote,
  resolvedAt: record.resolvedAt?.toISOString() ?? null,
  createdAt: record.createdAt.toISOString(),
});

export const listDriverFaults = async (driverId: string): Promise<VehicleFaultDto[]> => {
  const records = await prisma.vehicleFault.findMany({
    where: { driverId },
    include: faultInclude,
    orderBy: [{ reportedAt: 'desc' }, { createdAt: 'desc' }],
    take: 50,
  });

  return records.map(toVehicleFaultDto);
};

export const reportVehicleFault = async (
  driverId: string,
  input: VehicleFaultCreateRequest,
  now: Date = new Date(),
): Promise<VehicleFaultDto> => {
  if (input.reportedAt > portalTodayIso(now)) {
    throw badRequest('Datum prijave ne može biti u budućnosti.');
  }

  await assertVehicle(input.vehicleId);
  await assertOdometerNotBelowKnown(input.vehicleId, input.reportedAt, input.odometerKm);

  if (input.fileId) {
    await assertReceipt(input.fileId);
  }

  const record = await prisma.vehicleFault.create({
    data: {
      organizationId: requireOrganizationId(),
      vehicleId: input.vehicleId,
      driverId,
      reportedAt: parseDate(input.reportedAt),
      odometerKm: input.odometerKm,
      description: input.description,
      fileId: input.fileId,
    },
    include: faultInclude,
  });

  await recordAuditEvent({
    action: 'VEHICLE_FAULT_REPORTED',
    entityType: 'VehicleFault',
    entityId: record.id,
    actorUserId: null,
    metadata: { driverId, vehicleId: input.vehicleId },
  });
  logger.info('Vehicle fault reported', { faultId: record.id, vehicleId: input.vehicleId });

  return toVehicleFaultDto(record);
};

export const listVehicleFaults = async (
  query: VehicleFaultListQuery,
): Promise<VehicleFaultDto[]> => {
  const records = await prisma.vehicleFault.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
    },
    include: faultInclude,
    orderBy: [{ reportedAt: 'desc' }, { createdAt: 'desc' }],
    take: 200,
  });

  return records.map(toVehicleFaultDto);
};

export const updateVehicleFault = async (
  id: string,
  input: VehicleFaultUpdateRequest,
): Promise<VehicleFaultDto> => {
  const existing = await prisma.vehicleFault.findUnique({
    where: { id },
    select: { status: true, resolvedAt: true },
  });

  if (!existing) {
    throw notFound('Prijava kvara nije pronađena.');
  }

  const record = await prisma.vehicleFault.update({
    where: { id },
    data: {
      status: input.status,
      officeNote: input.officeNote,
      resolvedAt: input.status === 'RESOLVED' ? (existing.resolvedAt ?? new Date()) : null,
    },
    include: faultInclude,
  });

  await recordAuditEvent({
    action: 'VEHICLE_FAULT_UPDATED',
    entityType: 'VehicleFault',
    entityId: id,
    metadata: { from: existing.status, to: input.status },
  });

  return toVehicleFaultDto(record);
};

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

const toolInclude = { vehicle: { select: { id: true, licensePlate: true } } } as const;

type ToolRecord = {
  id: string;
  driverId: string;
  name: string;
  quantity: number;
  source: DriverToolDto['source'];
  status: DriverToolDto['status'];
  assignedAt: Date;
  respondedAt: Date | null;
  lostAt: Date | null;
  lostNote: string | null;
  returnedAt: Date | null;
  note: string | null;
  vehicle: { id: string; licensePlate: string } | null;
};

export const toDriverToolDto = (record: ToolRecord): DriverToolDto => ({
  id: record.id,
  driverId: record.driverId,
  vehicle: record.vehicle,
  name: record.name,
  quantity: record.quantity,
  source: record.source,
  status: record.status,
  assignedAt: toIsoDate(record.assignedAt),
  respondedAt: record.respondedAt?.toISOString() ?? null,
  lostAt: record.lostAt ? toIsoDate(record.lostAt) : null,
  lostNote: record.lostNote,
  returnedAt: record.returnedAt ? toIsoDate(record.returnedAt) : null,
  note: record.note,
});

const listToolsOf = async (driverId: string): Promise<DriverToolDto[]> => {
  const records = await prisma.driverTool.findMany({
    where: { driverId },
    include: toolInclude,
    orderBy: [{ assignedAt: 'desc' }, { createdAt: 'desc' }],
  });

  return records.map(toDriverToolDto);
};

/** The driver's own list: everything that is or was with them. */
export const listPortalTools = (driverId: string): Promise<DriverToolDto[]> =>
  listToolsOf(driverId);

const findDriverTool = async (driverId: string, toolId: string) => {
  const tool = await prisma.driverTool.findFirst({
    where: { id: toolId, driverId },
    select: { id: true, status: true, source: true },
  });

  if (!tool) {
    throw notFound('Alat nije pronađen.');
  }

  return tool;
};

/** `fromDriver` marks portal actions, which have no signed-in user. */
const toolAudit = (
  action: 'DRIVER_TOOL_SAVED' | 'DRIVER_TOOL_RESPONDED',
  toolId: string,
  fromDriver: boolean,
  metadata: Record<string, string>,
) =>
  recordAuditEvent({
    action,
    entityType: 'DriverTool',
    entityId: toolId,
    ...(fromDriver ? { actorUserId: null } : {}),
    metadata,
  });

/** The driver writes down a tool the office has not listed yet; the office then confirms it. */
export const addPortalTool = async (
  driverId: string,
  input: DriverPortalToolCreateRequest,
  now: Date = new Date(),
): Promise<DriverToolDto[]> => {
  if (input.vehicleId) {
    await assertVehicle(input.vehicleId);
  }

  const tool = await prisma.driverTool.create({
    data: {
      organizationId: requireOrganizationId(),
      driverId,
      vehicleId: input.vehicleId,
      name: input.name,
      quantity: input.quantity,
      note: input.note,
      source: 'DRIVER',
      status: 'PENDING',
      assignedAt: parseDate(portalTodayIso(now)),
      respondedAt: now,
    },
    select: { id: true },
  });

  await toolAudit('DRIVER_TOOL_SAVED', tool.id, true, { driverId, source: 'DRIVER' });

  return listToolsOf(driverId);
};

/** The driver confirms or declines a tool the office listed on them. */
export const respondToTool = async (
  driverId: string,
  toolId: string,
  input: DriverToolRespondRequest,
  now: Date = new Date(),
): Promise<DriverToolDto[]> => {
  const tool = await findDriverTool(driverId, toolId);

  if (tool.source !== 'OFFICE' || tool.status !== 'PENDING') {
    throw conflict('Ovaj alat je već potvrđen ili odbijen.');
  }

  await prisma.driverTool.update({
    where: { id: toolId },
    data: { status: input.action === 'CONFIRM' ? 'CONFIRMED' : 'DECLINED', respondedAt: now },
  });
  await toolAudit('DRIVER_TOOL_RESPONDED', toolId, true, { driverId, action: input.action });

  return listToolsOf(driverId);
};

/** Confirms every tool still waiting for the driver: the first look at the whole list. */
export const confirmAllTools = async (
  driverId: string,
  now: Date = new Date(),
): Promise<DriverToolDto[]> => {
  const pending = await prisma.driverTool.findMany({
    where: { driverId, source: 'OFFICE', status: 'PENDING' },
    select: { id: true },
  });

  if (pending.length > 0) {
    await prisma.driverTool.updateMany({
      where: { id: { in: pending.map((tool) => tool.id) } },
      data: { status: 'CONFIRMED', respondedAt: now },
    });
    await Promise.all(
      pending.map((tool) =>
        toolAudit('DRIVER_TOOL_RESPONDED', tool.id, true, { driverId, action: 'CONFIRM' }),
      ),
    );
  }

  return listToolsOf(driverId);
};

/** The driver reports a confirmed tool lost. */
export const reportToolLost = async (
  driverId: string,
  toolId: string,
  input: DriverToolLostRequest,
  now: Date = new Date(),
): Promise<DriverToolDto[]> => {
  const tool = await findDriverTool(driverId, toolId);

  if (tool.status !== 'CONFIRMED') {
    throw conflict('Kao izgubljen se može prijaviti samo alat koji je kod vas.');
  }

  if (input.lostAt > portalTodayIso(now)) {
    throw badRequest('Datum ne može biti u budućnosti.');
  }

  await prisma.driverTool.update({
    where: { id: toolId },
    data: { status: 'LOST', lostAt: parseDate(input.lostAt), lostNote: input.lostNote },
  });
  await toolAudit('DRIVER_TOOL_RESPONDED', toolId, true, { driverId, action: 'LOST' });

  return listToolsOf(driverId);
};

/** Office: every tool of one driver. */
export const listDriverTools = async (driverId: string): Promise<DriverToolDto[]> => {
  await assertDriver(driverId);

  return listToolsOf(driverId);
};

export const createDriverTool = async (
  driverId: string,
  input: DriverToolWriteRequest,
): Promise<DriverToolDto> => {
  await assertDriver(driverId);

  if (input.vehicleId) {
    await assertVehicle(input.vehicleId);
  }

  const record = await prisma.driverTool.create({
    data: {
      organizationId: requireOrganizationId(),
      driverId,
      vehicleId: input.vehicleId,
      name: input.name,
      quantity: input.quantity,
      assignedAt: parseDate(input.assignedAt),
      note: input.note,
      source: 'OFFICE',
      status: 'PENDING',
    },
    include: toolInclude,
  });

  await toolAudit('DRIVER_TOOL_SAVED', record.id, false, { driverId, source: 'OFFICE' });

  return toDriverToolDto(record);
};

/**
 * Office edit. Changing what was handed over (name or quantity) asks the driver to confirm again;
 * a note or vehicle change does not.
 */
export const updateDriverTool = async (
  driverId: string,
  toolId: string,
  input: DriverToolWriteRequest,
): Promise<DriverToolDto> => {
  const existing = await prisma.driverTool.findFirst({
    where: { id: toolId, driverId },
    select: { name: true, quantity: true, status: true, source: true },
  });

  if (!existing) {
    throw notFound('Alat nije pronađen.');
  }

  if (input.vehicleId) {
    await assertVehicle(input.vehicleId);
  }

  const changed = existing.name !== input.name || existing.quantity !== input.quantity;
  const reconfirm = changed && existing.source === 'OFFICE' && existing.status === 'CONFIRMED';

  const record = await prisma.driverTool.update({
    where: { id: toolId },
    data: {
      vehicleId: input.vehicleId,
      name: input.name,
      quantity: input.quantity,
      assignedAt: parseDate(input.assignedAt),
      note: input.note,
      ...(reconfirm ? { status: 'PENDING' as const, respondedAt: null } : {}),
    },
    include: toolInclude,
  });

  await toolAudit('DRIVER_TOOL_SAVED', toolId, false, { driverId, source: 'OFFICE' });

  return toDriverToolDto(record);
};

/** Office: accept a tool the driver wrote down, or take a tool back (also closes a lost one). */
export const applyDriverToolAction = async (
  driverId: string,
  toolId: string,
  input: DriverToolOfficeActionRequest,
  now: Date = new Date(),
): Promise<DriverToolDto> => {
  const tool = await findDriverTool(driverId, toolId);

  if (input.action === 'CONFIRM' && !(tool.source === 'DRIVER' && tool.status === 'PENDING')) {
    throw conflict('Potvrditi se može samo alat koji je vozač upisao.');
  }

  if (input.action === 'RETURN' && tool.status === 'RETURNED') {
    throw conflict('Alat je već razdužen.');
  }

  const record = await prisma.driverTool.update({
    where: { id: toolId },
    data:
      input.action === 'CONFIRM'
        ? { status: 'CONFIRMED' }
        : { status: 'RETURNED', returnedAt: parseDate(portalTodayIso(now)) },
    include: toolInclude,
  });

  await toolAudit('DRIVER_TOOL_SAVED', toolId, false, { driverId, action: input.action });

  return toDriverToolDto(record);
};

export const deleteDriverTool = async (driverId: string, toolId: string): Promise<void> => {
  await findDriverTool(driverId, toolId);
  await prisma.driverTool.delete({ where: { id: toolId } });
};

// ---------------------------------------------------------------------------
// Free diesel entries
// ---------------------------------------------------------------------------

const fuelInclude = {
  vehicle: { select: vehicleSelect },
  driver: { select: { id: true, firstName: true, lastName: true } },
  paymentCard: { select: { id: true, name: true } },
  file: { select: fileSelect },
} as const;

type FuelRecord = {
  id: string;
  fueledAt: string;
  odometerKm: number;
  liters: number;
  amount: number;
  fuelType: DriverFuelEntryDto['fuelType'];
  paymentMethod: string;
  note: string | null;
  status: DriverFuelEntryDto['status'];
  rejectionReason: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  vehicle: DriverPortalVehicleOptionDto;
  driver: { id: string; firstName: string; lastName: string };
  paymentCard: { id: string; name: string } | null;
  file: { id: string; originalName: string } | null;
};

export const toDriverFuelEntryDto = (record: FuelRecord): DriverFuelEntryDto => ({
  id: record.id,
  driver: { id: record.driver.id, name: personName(record.driver) },
  vehicle: record.vehicle,
  fueledAt: record.fueledAt,
  odometerKm: record.odometerKm,
  liters: record.liters,
  amount: record.amount,
  fuelType: record.fuelType,
  paymentMethod: record.paymentMethod === 'COMPANY_CARD' ? 'COMPANY_CARD' : 'CASH',
  paymentCard: record.paymentCard,
  file: record.file,
  note: record.note,
  status: record.status,
  rejectionReason: record.rejectionReason,
  reviewedAt: record.reviewedAt?.toISOString() ?? null,
  createdAt: record.createdAt.toISOString(),
});

export const listPortalFuelEntries = async (driverId: string): Promise<DriverFuelEntryDto[]> => {
  const records = await prisma.driverFuelEntry.findMany({
    where: { driverId },
    include: fuelInclude,
    orderBy: [{ fueledAt: 'desc' }, { createdAt: 'desc' }],
    take: 30,
  });

  return records.map(toDriverFuelEntryDto);
};

export const submitPortalFuelEntry = async (
  driverId: string,
  input: DriverFuelEntryCreateRequest,
  now: Date = new Date(),
): Promise<DriverFuelEntryDto> => {
  if (input.fueledAt.slice(0, 10) > portalTodayIso(now)) {
    throw badRequest('Datum sipanja ne može biti u budućnosti.');
  }

  await assertVehicle(input.vehicleId);
  await assertOdometerNotBelowKnown(input.vehicleId, input.fueledAt.slice(0, 10), input.odometerKm);

  if (input.paymentCardId) {
    const card = await prisma.paymentCard.findUnique({
      where: { id: input.paymentCardId },
      select: { isActive: true },
    });

    if (!card?.isActive) {
      throw badRequest('Kartica nije pronađena.');
    }
  }

  if (input.fileId) {
    await assertReceipt(input.fileId);
  }

  const record = await prisma.driverFuelEntry.create({
    data: {
      organizationId: requireOrganizationId(),
      driverId,
      vehicleId: input.vehicleId,
      fueledAt: input.fueledAt,
      odometerKm: input.odometerKm,
      liters: input.liters,
      amount: input.amount,
      fuelType: input.fuelType,
      paymentMethod: input.paymentMethod,
      paymentCardId: input.paymentCardId,
      fileId: input.fileId,
      note: input.note,
    },
    include: fuelInclude,
  });

  await recordAuditEvent({
    action: 'DRIVER_FUEL_ENTRY_SUBMITTED',
    entityType: 'DriverFuelEntry',
    entityId: record.id,
    actorUserId: null,
    metadata: { driverId, vehicleId: input.vehicleId },
  });

  return toDriverFuelEntryDto(record);
};

export const listDriverFuelEntries = async (
  query: DriverFuelEntryListQuery,
): Promise<DriverFuelEntryDto[]> => {
  const records = await prisma.driverFuelEntry.findMany({
    where: query.status ? { status: query.status } : {},
    include: fuelInclude,
    orderBy: [{ createdAt: 'desc' }],
    take: 200,
  });

  return records.map(toDriverFuelEntryDto);
};

const paymentLabel = (entry: {
  paymentMethod: string;
  paymentCard: { name: string } | null;
}): string => (entry.paymentMethod === 'CASH' ? 'keš' : (entry.paymentCard?.name ?? 'kartica'));

/**
 * Accepting records the fill-up in the fuel log for consumption (liters and km). The money stays on
 * the entry, as with fuel from trip reports, so a card invoice booked later is not counted twice.
 */
export const reviewDriverFuelEntry = async (
  id: string,
  input: DriverFuelEntryReviewRequest,
  now: Date = new Date(),
): Promise<DriverFuelEntryDto> => {
  const entry = await prisma.driverFuelEntry.findUnique({ where: { id }, include: fuelInclude });

  if (!entry) {
    throw notFound('Unos nije pronađen.');
  }

  if (entry.status !== 'PENDING') {
    throw conflict('Ovaj unos je već obrađen.');
  }

  let fuelLogId: string | null = null;

  if (input.action === 'ACCEPT') {
    const fuelLog = await createFuelLog({
      vehicleId: entry.vehicleId,
      fueledAt: entry.fueledAt.slice(0, 10),
      location: '',
      driverId: entry.driverId,
      fuelType: entry.fuelType,
      litersFilled: entry.liters,
      odometerKm: entry.odometerKm,
      cost: null,
      paymentMethod: null,
      supplier: 'Pumpa (unos vozača)',
      note: `Slobodan unos vozača: ${entry.amount} RSD, ${paymentLabel(entry)}.`,
    });
    fuelLogId = fuelLog.id;
  }

  const record = await prisma.driverFuelEntry.update({
    where: { id },
    data: {
      status: input.action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED',
      rejectionReason: input.action === 'REJECT' ? input.rejectionReason : null,
      reviewedAt: now,
      fuelLogId,
    },
    include: fuelInclude,
  });

  await recordAuditEvent({
    action: 'DRIVER_FUEL_ENTRY_REVIEWED',
    entityType: 'DriverFuelEntry',
    entityId: id,
    metadata: { action: input.action },
  });

  return toDriverFuelEntryDto(record);
};

const NEEDS_OFFICE = {
  OR: [
    { source: 'DRIVER' as const, status: 'PENDING' as const },
    { status: { in: ['LOST' as const, 'DECLINED' as const] } },
  ],
};

/** Tools across all drivers the office has to act on: written by a driver, lost, or not received. */
export const listToolsNeedingOffice = async (): Promise<DriverToolAttentionDto[]> => {
  const records = await prisma.driverTool.findMany({
    where: NEEDS_OFFICE,
    include: { ...toolInclude, driver: { select: { firstName: true, lastName: true } } },
    orderBy: [{ updatedAt: 'desc' }],
    take: 200,
  });

  return records.map((record) => ({
    ...toDriverToolDto(record),
    driverName: personName(record.driver),
  }));
};

/** Counts for the office badge: new faults, fuel entries and tools waiting on the office. */
export const countWorkplacePending = async (): Promise<DriverWorkplacePendingDto> => {
  const [faults, fuelEntries, tools] = await Promise.all([
    prisma.vehicleFault.count({ where: { status: 'REPORTED' } }),
    prisma.driverFuelEntry.count({ where: { status: 'PENDING' } }),
    prisma.driverTool.count({ where: NEEDS_OFFICE }),
  ]);

  return { faults, fuelEntries, tools };
};
