import {
  defaultFinanceReportRange,
  type BusinessAnalyticsDto,
  type BusinessAnalyticsQueryRequest,
  type DriverAnalyticsRowDto,
  type PartnerAnalyticsRowDto,
  type SupplierAnalyticsRowDto,
  type VehicleAnalyticsRowDto,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';

const parseDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

const roundMoney = (value: number): number => Math.round(value * 100) / 100;
const roundKm = (value: number): number => Math.round(value * 10) / 10;

const vehicleLabel = (vehicle: { make: string; model: string; licensePlate: string }): string =>
  `${vehicle.make} ${vehicle.model} · ${vehicle.licensePlate}`;

const supplierKey = (supplierId: string | null, supplier: string | null): string =>
  supplierId ?? `name:${supplier?.trim() || 'Bez dobavljača'}`;

const partnerKey = (partnerId: string | null, clientName: string | null): string =>
  partnerId ?? `client:${clientName?.trim() || 'Bez kupca'}`;

const tripPartnerLabel = (trip: {
  clientName: string | null;
  partner: {
    type: string;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
}): string => {
  if (trip.clientName?.trim()) {
    return trip.clientName.trim();
  }

  if (!trip.partner) {
    return 'Bez kupca';
  }

  if (trip.partner.type === 'INDIVIDUAL') {
    return `${trip.partner.firstName ?? ''} ${trip.partner.lastName ?? ''}`.trim() || 'Bez kupca';
  }

  return trip.partner.companyName?.trim() || 'Bez kupca';
};

const addSupplier = (
  rows: Map<string, SupplierAnalyticsRowDto>,
  supplierId: string | null,
  supplier: string | null,
  patch: Partial<Omit<SupplierAnalyticsRowDto, 'supplierKey' | 'supplierLabel'>>,
): void => {
  const key = supplierKey(supplierId, supplier);
  const row = rows.get(key) ?? {
    supplierKey: key,
    supplierLabel: supplier?.trim() || 'Bez dobavljača',
    invoiceTotal: 0,
    paidTotal: 0,
    openTotal: 0,
    fuelExpense: 0,
    maintenanceExpense: 0,
    transactionExpense: 0,
  };

  row.invoiceTotal += patch.invoiceTotal ?? 0;
  row.paidTotal += patch.paidTotal ?? 0;
  row.openTotal += patch.openTotal ?? 0;
  row.fuelExpense += patch.fuelExpense ?? 0;
  row.maintenanceExpense += patch.maintenanceExpense ?? 0;
  row.transactionExpense += patch.transactionExpense ?? 0;
  rows.set(key, row);
};

const allocationMap = async (): Promise<Map<string, number>> => {
  const rows = await prisma.paymentAllocation.groupBy({
    by: ['targetType', 'targetId'],
    _sum: { amount: true },
  });

  return new Map(
    rows.map((row) => [`${row.targetType}:${row.targetId}`, roundMoney(row._sum.amount ?? 0)]),
  );
};

export const getBusinessAnalytics = async (
  query: BusinessAnalyticsQueryRequest,
): Promise<BusinessAnalyticsDto> => {
  const defaults = defaultFinanceReportRange();
  const from = query.from ?? defaults.from;
  const to = query.to ?? defaults.to;
  const fromDate = parseDate(from);
  const toDate = parseDate(to);

  const [
    allocations,
    vehicles,
    suppliers,
    tripKmRows,
    invoiceRows,
    companyExpenses,
    fuelLogs,
    maintenanceRecords,
    financeExpenses,
    driverAssignments,
  ] = await Promise.all([
    allocationMap(),
    prisma.vehicle.findMany({
      select: { id: true, make: true, model: true, licensePlate: true },
      orderBy: [{ make: 'asc' }, { model: 'asc' }],
    }),
    prisma.supplier.findMany({
      select: { id: true, name: true },
    }),
    prisma.trip.findMany({
      where: { departureDate: { gte: fromDate, lte: toDate }, status: { not: 'CANCELLED' } },
      select: {
        id: true,
        distanceKm: true,
        vehicles: { select: { vehicleId: true } },
      },
    }),
    prisma.trip.findMany({
      where: { invoicedAt: { gte: fromDate, lte: toDate }, invoiceGrossAmount: { not: null } },
      select: {
        id: true,
        partnerId: true,
        clientName: true,
        invoiceGroupId: true,
        invoiceGrossAmount: true,
        vehicles: { select: { vehicleId: true } },
        partner: { select: { type: true, companyName: true, firstName: true, lastName: true } },
      },
    }),
    prisma.companyExpense.findMany({
      where: { issuedAt: { gte: fromDate, lte: toDate } },
      select: {
        id: true,
        supplier: true,
        supplierId: true,
        amountWithVat: true,
        vehicleId: true,
      },
    }),
    prisma.fuelLog.findMany({
      where: { fueledAt: { gte: fromDate, lte: toDate }, cost: { not: null } },
      select: { supplier: true, supplierId: true, cost: true, vehicleId: true },
    }),
    prisma.vehicleMaintenance.findMany({
      where: { date: { gte: fromDate, lte: toDate } },
      select: { supplier: true, supplierId: true, cost: true, vehicleId: true },
    }),
    prisma.financeTransaction.findMany({
      where: {
        type: 'EXPENSE',
        occurredAt: { gte: fromDate, lte: toDate },
        sourceType: {
          in: [
            'MANUAL',
            'BANK_STATEMENT',
            'TRIP_EXPENSE',
            'TRIP_DRIVER_PER_DIEM',
            'TRIP_DRIVER_ADVANCE',
          ],
        },
      },
      select: { amount: true, supplier: true, supplierId: true, sourceType: true, vehicleId: true },
    }),
    prisma.tripDriver.findMany({
      where: {
        trip: { departureDate: { gte: fromDate, lte: toDate }, status: { not: 'CANCELLED' } },
      },
      select: {
        driverId: true,
        perDiemAmount: true,
        advanceAmount: true,
        driver: { select: { firstName: true, lastName: true } },
        trip: { select: { id: true, distanceKm: true } },
      },
    }),
  ]);

  const vehicleRows = new Map<string, VehicleAnalyticsRowDto>(
    vehicles.map((vehicle) => [
      vehicle.id,
      {
        vehicleId: vehicle.id,
        vehicleLabel: vehicleLabel(vehicle),
        tripCount: 0,
        distanceKm: 0,
        invoicedRevenue: 0,
        collectedRevenue: 0,
        openReceivables: 0,
        fuelExpense: 0,
        maintenanceExpense: 0,
        tripExpense: 0,
        driverPayouts: 0,
        totalExpense: 0,
        invoicedProfit: 0,
        collectedProfit: 0,
      },
    ]),
  );
  const partnerRows = new Map<string, PartnerAnalyticsRowDto>();
  const supplierRows = new Map<string, SupplierAnalyticsRowDto>();
  const supplierNames = new Map(suppliers.map((supplier) => [supplier.id, supplier.name]));
  const driverRows = new Map<string, DriverAnalyticsRowDto>();

  let tripCount = 0;
  let tripDistanceKm = 0;

  for (const trip of tripKmRows) {
    tripCount += 1;
    const distance = trip.distanceKm ?? 0;
    tripDistanceKm += distance * Math.max(1, trip.vehicles.length);

    for (const assignment of trip.vehicles) {
      const row = vehicleRows.get(assignment.vehicleId);

      if (row) {
        row.tripCount += 1;
        row.distanceKm += distance;
      }
    }
  }

  const groupGrossTotals = new Map<string, number>();

  for (const trip of invoiceRows) {
    if (trip.invoiceGroupId) {
      groupGrossTotals.set(
        trip.invoiceGroupId,
        (groupGrossTotals.get(trip.invoiceGroupId) ?? 0) + (trip.invoiceGrossAmount ?? 0),
      );
    }
  }

  let invoicedRevenue = 0;
  let collectedRevenue = 0;

  for (const trip of invoiceRows) {
    const gross = trip.invoiceGrossAmount ?? 0;
    const allocated = trip.invoiceGroupId
      ? ((allocations.get(`TRIP_SERIES_INVOICE:${trip.invoiceGroupId}`) ?? 0) * gross) /
        Math.max(gross, groupGrossTotals.get(trip.invoiceGroupId) ?? gross)
      : (allocations.get(`TRIP_INVOICE:${trip.id}`) ?? 0);
    const collected = roundMoney(Math.min(gross, allocated));
    const vehicleCount = Math.max(1, trip.vehicles.length);
    const vehicleInvoiceShare = gross / vehicleCount;
    const vehicleCollectedShare = collected / vehicleCount;
    const key = partnerKey(trip.partnerId, trip.clientName);
    const partner = partnerRows.get(key) ?? {
      partnerKey: key,
      partnerLabel: tripPartnerLabel(trip),
      tripCount: 0,
      invoicedRevenue: 0,
      collectedRevenue: 0,
      openReceivables: 0,
    };

    invoicedRevenue += gross;
    collectedRevenue += collected;
    partner.tripCount += 1;
    partner.invoicedRevenue += gross;
    partner.collectedRevenue += collected;
    partner.openReceivables += gross - collected;
    partnerRows.set(key, partner);

    for (const assignment of trip.vehicles) {
      const row = vehicleRows.get(assignment.vehicleId);

      if (row) {
        row.invoicedRevenue += vehicleInvoiceShare;
        row.collectedRevenue += vehicleCollectedShare;
        row.openReceivables += vehicleInvoiceShare - vehicleCollectedShare;
      }
    }
  }

  let supplierDebt = 0;
  let supplierPaid = 0;

  for (const expense of companyExpenses) {
    const paid = Math.min(
      expense.amountWithVat,
      allocations.get(`COMPANY_EXPENSE:${expense.id}`) ?? 0,
    );
    supplierDebt += expense.amountWithVat;
    supplierPaid += paid;
    addSupplier(supplierRows, expense.supplierId, expense.supplier, {
      invoiceTotal: expense.amountWithVat,
      paidTotal: paid,
      openTotal: expense.amountWithVat - paid,
    });

    if (expense.vehicleId) {
      const row = vehicleRows.get(expense.vehicleId);

      if (row) {
        row.maintenanceExpense += expense.amountWithVat;
      }
    }
  }

  let fuelExpense = 0;
  for (const log of fuelLogs) {
    const amount = log.cost ?? 0;
    fuelExpense += amount;
    addSupplier(supplierRows, log.supplierId, log.supplier, { fuelExpense: amount });

    const row = vehicleRows.get(log.vehicleId);

    if (row) {
      row.fuelExpense += amount;
    }
  }

  let maintenanceExpense = 0;
  for (const maintenance of maintenanceRecords) {
    maintenanceExpense += maintenance.cost;
    addSupplier(supplierRows, maintenance.supplierId, maintenance.supplier, {
      maintenanceExpense: maintenance.cost,
    });

    const row = vehicleRows.get(maintenance.vehicleId);

    if (row) {
      row.maintenanceExpense += maintenance.cost;
    }
  }

  let tripExpense = 0;
  let driverPayouts = 0;
  for (const expense of financeExpenses) {
    if (expense.sourceType === 'TRIP_EXPENSE') {
      tripExpense += expense.amount;

      if (expense.vehicleId) {
        const row = vehicleRows.get(expense.vehicleId);

        if (row) {
          row.tripExpense += expense.amount;
        }
      }
    }

    if (
      expense.sourceType === 'TRIP_DRIVER_PER_DIEM' ||
      expense.sourceType === 'TRIP_DRIVER_ADVANCE'
    ) {
      driverPayouts += expense.amount;

      if (expense.vehicleId) {
        const row = vehicleRows.get(expense.vehicleId);

        if (row) {
          row.driverPayouts += expense.amount;
        }
      }
    }

    if (expense.supplier) {
      addSupplier(supplierRows, expense.supplierId, expense.supplier, {
        transactionExpense: expense.amount,
      });
    }
  }

  const driverTripIds = new Map<string, Set<string>>();
  for (const assignment of driverAssignments) {
    const driverName = `${assignment.driver.firstName} ${assignment.driver.lastName}`;
    const row = driverRows.get(assignment.driverId) ?? {
      driverId: assignment.driverId,
      driverName,
      tripCount: 0,
      distanceKm: 0,
      perDiemAmount: 0,
      advanceAmount: 0,
      totalPayout: 0,
    };
    const seen = driverTripIds.get(assignment.driverId) ?? new Set<string>();

    if (!seen.has(assignment.trip.id)) {
      row.tripCount += 1;
      row.distanceKm += assignment.trip.distanceKm ?? 0;
      seen.add(assignment.trip.id);
      driverTripIds.set(assignment.driverId, seen);
    }

    row.perDiemAmount += assignment.perDiemAmount ?? 0;
    row.advanceAmount += assignment.advanceAmount ?? 0;
    row.totalPayout = row.perDiemAmount + row.advanceAmount;
    driverRows.set(assignment.driverId, row);
  }

  for (const row of vehicleRows.values()) {
    row.distanceKm = roundKm(row.distanceKm);
    row.invoicedRevenue = roundMoney(row.invoicedRevenue);
    row.collectedRevenue = roundMoney(row.collectedRevenue);
    row.openReceivables = roundMoney(row.openReceivables);
    row.fuelExpense = roundMoney(row.fuelExpense);
    row.maintenanceExpense = roundMoney(row.maintenanceExpense);
    row.tripExpense = roundMoney(row.tripExpense);
    row.driverPayouts = roundMoney(row.driverPayouts);
    row.totalExpense = roundMoney(
      row.fuelExpense + row.maintenanceExpense + row.tripExpense + row.driverPayouts,
    );
    row.invoicedProfit = roundMoney(row.invoicedRevenue - row.totalExpense);
    row.collectedProfit = roundMoney(row.collectedRevenue - row.totalExpense);
  }

  for (const row of partnerRows.values()) {
    row.invoicedRevenue = roundMoney(row.invoicedRevenue);
    row.collectedRevenue = roundMoney(row.collectedRevenue);
    row.openReceivables = roundMoney(row.openReceivables);
  }

  for (const row of supplierRows.values()) {
    if (!row.supplierKey.startsWith('name:')) {
      row.supplierLabel = supplierNames.get(row.supplierKey) ?? row.supplierLabel;
    }

    row.invoiceTotal = roundMoney(row.invoiceTotal);
    row.paidTotal = roundMoney(row.paidTotal);
    row.openTotal = roundMoney(row.openTotal);
    row.fuelExpense = roundMoney(row.fuelExpense);
    row.maintenanceExpense = roundMoney(row.maintenanceExpense);
    row.transactionExpense = roundMoney(row.transactionExpense);
  }

  for (const row of driverRows.values()) {
    row.distanceKm = roundKm(row.distanceKm);
    row.perDiemAmount = roundMoney(row.perDiemAmount);
    row.advanceAmount = roundMoney(row.advanceAmount);
    row.totalPayout = roundMoney(row.totalPayout);
  }

  const totalExpense = roundMoney(
    fuelExpense + maintenanceExpense + supplierDebt + tripExpense + driverPayouts,
  );

  return {
    from,
    to,
    summary: {
      tripCount,
      tripDistanceKm: roundKm(tripDistanceKm),
      invoicedRevenue: roundMoney(invoicedRevenue),
      collectedRevenue: roundMoney(collectedRevenue),
      openReceivables: roundMoney(invoicedRevenue - collectedRevenue),
      supplierDebt: roundMoney(supplierDebt),
      supplierPaid: roundMoney(supplierPaid),
      openPayables: roundMoney(supplierDebt - supplierPaid),
      fuelExpense: roundMoney(fuelExpense),
      maintenanceExpense: roundMoney(maintenanceExpense + supplierDebt),
      tripExpense: roundMoney(tripExpense),
      driverPayouts: roundMoney(driverPayouts),
      totalExpense,
      invoicedProfit: roundMoney(invoicedRevenue - totalExpense),
      collectedProfit: roundMoney(collectedRevenue - totalExpense),
    },
    vehicles: [...vehicleRows.values()]
      .filter(
        (row) =>
          row.tripCount > 0 ||
          row.invoicedRevenue > 0 ||
          row.fuelExpense > 0 ||
          row.maintenanceExpense > 0 ||
          row.tripExpense > 0 ||
          row.driverPayouts > 0,
      )
      .sort((left, right) => right.invoicedProfit - left.invoicedProfit),
    partners: [...partnerRows.values()].sort(
      (left, right) => right.openReceivables - left.openReceivables,
    ),
    suppliers: [...supplierRows.values()].sort((left, right) => right.openTotal - left.openTotal),
    drivers: [...driverRows.values()].sort((left, right) => right.totalPayout - left.totalPayout),
  };
};
