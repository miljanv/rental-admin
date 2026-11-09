import { Readable, type Writable } from 'node:stream';

import archiver from 'archiver';

import { prismaUnscoped } from '../config/prisma';
import { CHILD_SCOPE_PATHS, OWNED_MODELS } from '../config/tenant-scope';
import { Prisma } from '../generated/prisma/client';
import { notFound } from '../utils/app-error';
import { CSV_BOM, toCsvLine } from '../utils/csv';
import { logger } from '../utils/logger';
import { recordAuditEvent } from './audit.service';

/** Rows read per query, so a large organization never sits in memory at once. */
export const EXPORT_BATCH_SIZE = 500;

/** Never leaves the API, whatever the model. */
const EXCLUDED_COLUMNS = /password|token|secret|storagekey/i;

type ExportRow = Record<string, unknown> & { id: string };

interface ExportQuery {
  where: object;
  select: Record<string, true>;
  orderBy: { id: 'asc' };
  take: number;
}

interface ExportDelegate {
  findMany(args: ExportQuery): Promise<ExportRow[]>;
}

export interface ExportDataset {
  fileName: string;
  model: string;
  delegate: ExportDelegate;
  columns: readonly string[];
}

const dataset = (
  fileName: string,
  model: string,
  delegate: unknown,
  fields: Record<string, string>,
): ExportDataset => ({
  fileName,
  model,
  // Every generated delegate accepts `ExportQuery`, but their types cannot be unified.
  delegate: delegate as ExportDelegate,
  columns: Object.values(fields).filter((column) => !EXCLUDED_COLUMNS.test(column)),
});

/** One CSV per entity. Uploaded files are listed in `files.csv`; their bytes stay in S3. */
export const exportDatasets = (): ExportDataset[] => [
  dataset(
    'organization.csv',
    'Organization',
    prismaUnscoped.organization,
    Prisma.OrganizationScalarFieldEnum,
  ),
  dataset('vehicles.csv', 'Vehicle', prismaUnscoped.vehicle, Prisma.VehicleScalarFieldEnum),
  dataset('drivers.csv', 'Driver', prismaUnscoped.driver, Prisma.DriverScalarFieldEnum),
  dataset('partners.csv', 'Partner', prismaUnscoped.partner, Prisma.PartnerScalarFieldEnum),
  dataset(
    'partner-bank-accounts.csv',
    'PartnerBankAccount',
    prismaUnscoped.partnerBankAccount,
    Prisma.PartnerBankAccountScalarFieldEnum,
  ),
  dataset('suppliers.csv', 'Supplier', prismaUnscoped.supplier, Prisma.SupplierScalarFieldEnum),
  dataset(
    'supplier-bank-accounts.csv',
    'SupplierBankAccount',
    prismaUnscoped.supplierBankAccount,
    Prisma.SupplierBankAccountScalarFieldEnum,
  ),
  dataset('trips.csv', 'Trip', prismaUnscoped.trip, Prisma.TripScalarFieldEnum),
  dataset(
    'trip-vehicles.csv',
    'TripVehicle',
    prismaUnscoped.tripVehicle,
    Prisma.TripVehicleScalarFieldEnum,
  ),
  dataset(
    'trip-drivers.csv',
    'TripDriver',
    prismaUnscoped.tripDriver,
    Prisma.TripDriverScalarFieldEnum,
  ),
  dataset(
    'trip-expenses.csv',
    'TripExpense',
    prismaUnscoped.tripExpense,
    Prisma.TripExpenseScalarFieldEnum,
  ),
  dataset(
    'trip-cash-payments.csv',
    'TripCashPayment',
    prismaUnscoped.tripCashPayment,
    Prisma.TripCashPaymentScalarFieldEnum,
  ),
  dataset(
    'trip-billing-documents.csv',
    'TripBillingDocument',
    prismaUnscoped.tripBillingDocument,
    Prisma.TripBillingDocumentScalarFieldEnum,
  ),
  dataset(
    'trip-series.csv',
    'TripSeries',
    prismaUnscoped.tripSeries,
    Prisma.TripSeriesScalarFieldEnum,
  ),
  dataset(
    'trip-series-pauses.csv',
    'TripSeriesPause',
    prismaUnscoped.tripSeriesPause,
    Prisma.TripSeriesPauseScalarFieldEnum,
  ),
  dataset(
    'company-expenses.csv',
    'CompanyExpense',
    prismaUnscoped.companyExpense,
    Prisma.CompanyExpenseScalarFieldEnum,
  ),
  dataset(
    'finance-transactions.csv',
    'FinanceTransaction',
    prismaUnscoped.financeTransaction,
    Prisma.FinanceTransactionScalarFieldEnum,
  ),
  dataset(
    'payment-allocations.csv',
    'PaymentAllocation',
    prismaUnscoped.paymentAllocation,
    Prisma.PaymentAllocationScalarFieldEnum,
  ),
  dataset('contracts.csv', 'Contract', prismaUnscoped.contract, Prisma.ContractScalarFieldEnum),
  dataset('fuel-logs.csv', 'FuelLog', prismaUnscoped.fuelLog, Prisma.FuelLogScalarFieldEnum),
  dataset(
    'vehicle-maintenance.csv',
    'VehicleMaintenance',
    prismaUnscoped.vehicleMaintenance,
    Prisma.VehicleMaintenanceScalarFieldEnum,
  ),
  dataset(
    'vat-returns.csv',
    'VatReturn',
    prismaUnscoped.vatReturn,
    Prisma.VatReturnScalarFieldEnum,
  ),
  dataset(
    'opening-balances.csv',
    'OpeningBalance',
    prismaUnscoped.openingBalance,
    Prisma.OpeningBalanceScalarFieldEnum,
  ),
  dataset('files.csv', 'FileObject', prismaUnscoped.fileObject, Prisma.FileObjectScalarFieldEnum),
];

/** The `where` that keeps a model's rows to one organization, from the tenant policy. */
export const organizationScope = (model: string, organizationId: string): object => {
  if (model === 'Organization') {
    return { id: organizationId };
  }

  if ((OWNED_MODELS as readonly string[]).includes(model)) {
    return { organizationId };
  }

  const path = CHILD_SCOPE_PATHS[model];

  if (!path) {
    throw new Error(`No tenant scope for ${model}`);
  }

  return path.reduceRight<object>((inner, relation) => ({ [relation]: inner }), {
    organizationId,
  });
};

async function* csvChunks(item: ExportDataset, organizationId: string): AsyncGenerator<string> {
  const scope = organizationScope(item.model, organizationId);
  const select = Object.fromEntries(item.columns.map((column) => [column, true as const]));
  let afterId: string | null = null;

  yield CSV_BOM + toCsvLine(item.columns);

  for (;;) {
    const rows: ExportRow[] = await item.delegate.findMany({
      where: afterId ? { AND: [scope, { id: { gt: afterId } }] } : scope,
      select,
      orderBy: { id: 'asc' },
      take: EXPORT_BATCH_SIZE,
    });

    if (rows.length > 0) {
      yield rows.map((row) => toCsvLine(item.columns.map((column) => row[column]))).join('');
    }

    if (rows.length < EXPORT_BATCH_SIZE) {
      return;
    }

    afterId = rows[rows.length - 1]!.id;
  }
}

const toFileNamePart = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('đ', 'dj')
    .replaceAll('Đ', 'Dj')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'firma';

/** Checks the organization exists and names the download, e.g. `firma-bus-travel-2026-11-09.zip`. */
export const prepareOrganizationExport = async (
  organizationId: string,
  now: Date = new Date(),
): Promise<{ fileName: string }> => {
  const organization = await prismaUnscoped.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });

  if (!organization) {
    throw notFound('Firma nije pronađena.');
  }

  return {
    fileName: `firma-${toFileNamePart(organization.name)}-${now.toISOString().slice(0, 10)}.zip`,
  };
};

/**
 * Streams the zip into `output`, one CSV and one batch at a time. A failure
 * after the first byte cannot become a JSON error, so it breaks the download.
 */
export const writeOrganizationExport = async (
  organizationId: string,
  output: Writable,
): Promise<void> => {
  const archive = archiver('zip', { zlib: { level: 6 } });
  let failSource: (error: Error) => void = () => undefined;
  const finished = new Promise<void>((resolve, reject) => {
    failSource = reject;
    output.on('finish', resolve);
    output.on('close', () => {
      if (!output.writableFinished) {
        reject(new Error('Organization export download was interrupted'));
      }
    });
    archive.on('error', reject);
    output.on('error', reject);
  });

  archive.pipe(output);

  for (const item of exportDatasets()) {
    const source = Readable.from(csvChunks(item, organizationId));

    // archiver does not forward an error of an entry's stream; without this a failed query hangs.
    source.once('error', failSource);
    archive.append(source, { name: item.fileName });
  }

  try {
    await Promise.all([archive.finalize(), finished]);
  } catch (error) {
    archive.abort();
    output.destroy(error instanceof Error ? error : undefined);
    throw error;
  }

  logger.info('Organization exported', { organizationId });
  await recordAuditEvent({
    action: 'ORGANIZATION_EXPORTED',
    entityType: 'Organization',
    entityId: organizationId,
    organizationId,
  });
};
