import { PassThrough } from 'node:stream';
import { inflateRawSync } from 'node:zlib';

import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;

const { tables, findManyCalls } = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  findManyCalls: [] as { model: string; where: unknown }[],
}));

vi.mock('../config/prisma', () => {
  const matches = (row: unknown, where: unknown): boolean => {
    if (!row || typeof row !== 'object') {
      return false;
    }

    return Object.entries(where as Record<string, unknown>).every(([key, expected]) => {
      const actual = (row as Record<string, unknown>)[key];

      if (key === 'AND') {
        return (expected as unknown[]).every((part) => matches(row, part));
      }

      if (expected && typeof expected === 'object' && 'gt' in expected) {
        return String(actual) > String((expected as { gt: unknown }).gt);
      }

      if (expected && typeof expected === 'object') {
        return matches(actual, expected);
      }

      return actual === expected;
    });
  };

  const delegate = (model: string) => ({
    findMany: vi.fn(
      async (args: { where: unknown; select: Record<string, true>; take: number }) => {
        findManyCalls.push({ model, where: args.where });

        return (tables[model] ?? [])
          .filter((row) => matches(row, args.where))
          .sort((a, b) => String(a.id).localeCompare(String(b.id)))
          .slice(0, args.take)
          .map((row) => Object.fromEntries(Object.keys(args.select).map((key) => [key, row[key]])));
      },
    ),
    findUnique: vi.fn(
      async ({ where }: { where: { id: string } }) =>
        (tables[model] ?? []).find((row) => row.id === where.id) ?? null,
    ),
  });

  return {
    prismaUnscoped: new Proxy({} as Record<string, unknown>, {
      get: (cache, property: string) => (cache[property] ??= delegate(property)),
    }),
  };
});
vi.mock('./audit.service', () => ({ recordAuditEvent: vi.fn() }));
vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { prismaUnscoped } from '../config/prisma';
import { recordAuditEvent } from './audit.service';
import {
  EXPORT_BATCH_SIZE,
  exportDatasets,
  organizationScope,
  prepareOrganizationExport,
  writeOrganizationExport,
} from './organization-export.service';

/** Reads every entry of a zip through its central directory. */
const unzip = (zip: Buffer): Map<string, string> => {
  const entries = new Map<string, string>();
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let offset = zip.readUInt32LE(end + 16);

  for (let index = 0; index < zip.readUInt16LE(end + 10); index += 1) {
    const method = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localOffset = zip.readUInt32LE(offset + 42);
    const name = zip.toString('utf8', offset + 46, offset + 46 + nameLength);
    const dataStart =
      localOffset + 30 + zip.readUInt16LE(localOffset + 26) + zip.readUInt16LE(localOffset + 28);
    const data = zip.subarray(dataStart, dataStart + compressedSize);

    entries.set(name, (method === 8 ? inflateRawSync(data) : data).toString('utf8'));
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
};

const runExport = async (organizationId: string): Promise<Map<string, string>> => {
  const output = new PassThrough();
  const chunks: Buffer[] = [];
  output.on('data', (chunk: Buffer) => chunks.push(chunk));

  await writeOrganizationExport(organizationId, output);

  return unzip(Buffer.concat(chunks));
};

const date = new Date('2026-11-01T08:00:00.000Z');

const seedTwoOrganizations = (): void => {
  for (const key of Object.keys(tables)) {
    delete tables[key];
  }

  tables.organization = [
    { id: 'org-a', name: 'Šumadija prevoz', isActive: true, createdAt: date },
    { id: 'org-b', name: 'Druga firma', isActive: true, createdAt: date },
  ];
  tables.vehicle = [
    { id: 'veh-a', organizationId: 'org-a', licensePlate: 'KG-001-ČŽ', createdAt: date },
    { id: 'veh-b', organizationId: 'org-b', licensePlate: 'BG-999-BB', createdAt: date },
  ];
  tables.fuelLog = [
    {
      id: 'fuel-a',
      vehicleId: 'veh-a',
      litersFilled: 55.4,
      vehicle: { organizationId: 'org-a' },
    },
    {
      id: 'fuel-b',
      vehicleId: 'veh-b',
      litersFilled: 99,
      vehicle: { organizationId: 'org-b' },
    },
  ];
  tables.tripBillingDocument = [
    { id: 'doc-a', tripId: 'trip-a', trip: { organizationId: 'org-a' } },
    { id: 'doc-b', tripId: 'trip-b', trip: { organizationId: 'org-b' } },
  ];
  tables.fileObject = [
    {
      id: 'file-a',
      organizationId: 'org-a',
      originalName: 'saobraćajna.pdf',
      storageKey: 'org-a/secret-key.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      createdAt: date,
    },
    {
      id: 'file-b',
      organizationId: 'org-b',
      originalName: 'tudje.pdf',
      storageKey: 'org-b/other.pdf',
      mimeType: 'application/pdf',
      size: 2048,
      createdAt: date,
    },
  ];
};

beforeEach(() => {
  vi.clearAllMocks();
  findManyCalls.length = 0;
  seedTwoOrganizations();
});

describe('writeOrganizationExport', () => {
  it('writes one CSV per entity with only the exported organization', async () => {
    const entries = await runExport('org-a');

    expect([...entries.keys()]).toEqual(exportDatasets().map((item) => item.fileName));
    expect(entries.get('vehicles.csv')).toContain('KG-001-ČŽ');
    expect(entries.get('fuel-logs.csv')).toContain('fuel-a');
    expect(entries.get('trip-billing-documents.csv')).toContain('doc-a');
    expect(entries.get('organization.csv')).toContain('Šumadija prevoz');

    const everything = [...entries.values()].join('\n');
    for (const leaked of ['org-b', 'veh-b', 'fuel-b', 'doc-b', 'file-b', 'Druga firma']) {
      expect(everything).not.toContain(leaked);
    }
  });

  it('filters every query by the organization', async () => {
    await runExport('org-a');

    expect(findManyCalls).toHaveLength(exportDatasets().length);
    for (const call of findManyCalls) {
      expect(JSON.stringify(call.where)).toMatch(/"(organizationId|id)":"org-a"/);
    }
  });

  it('lists files without their storage key', async () => {
    const files = (await runExport('org-a')).get('files.csv')!;

    expect(files).toContain('saobraćajna.pdf');
    expect(files).not.toMatch(/storageKey|secret-key/);
  });

  it('writes Excel-friendly CSV: BOM, semicolons, ISO dates, dot decimals', async () => {
    const entries = await runExport('org-a');
    const vehicles = entries.get('vehicles.csv')!;

    expect(vehicles.startsWith('\uFEFFid;')).toBe(true);
    expect(vehicles).toContain('2026-11-01T08:00:00.000Z');
    expect(entries.get('fuel-logs.csv')).toContain(';55.4;');
  });

  it('reads large tables in batches after the last id', async () => {
    tables.vehicle = Array.from({ length: EXPORT_BATCH_SIZE + 1 }, (_, index) => ({
      id: `veh-${String(index).padStart(4, '0')}`,
      organizationId: 'org-a',
    }));

    const vehicles = (await runExport('org-a')).get('vehicles.csv')!;

    expect(vehicles.trim().split('\r\n')).toHaveLength(EXPORT_BATCH_SIZE + 2);
    const vehicleCalls = findManyCalls.filter((call) => call.model === 'vehicle');
    expect(vehicleCalls).toHaveLength(2);
    expect(vehicleCalls[1]!.where).toEqual({
      AND: [
        { organizationId: 'org-a' },
        { id: { gt: `veh-${String(EXPORT_BATCH_SIZE - 1).padStart(4, '0')}` } },
      ],
    });
  });

  it('logs the export once it is complete', async () => {
    await runExport('org-a');

    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ORGANIZATION_EXPORTED', organizationId: 'org-a' }),
    );
  });

  it('breaks the download and logs nothing when a query fails', async () => {
    const delegate = (
      prismaUnscoped as unknown as Record<string, { findMany: ReturnType<typeof vi.fn> }>
    ).driver!;
    delegate.findMany.mockRejectedValueOnce(new Error('database down'));
    const output = new PassThrough();
    output.resume();

    await expect(writeOrganizationExport('org-a', output)).rejects.toThrow('database down');
    expect(output.destroyed).toBe(true);
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });
});

describe('organizationScope', () => {
  it('reaches child rows through their owner', () => {
    expect(organizationScope('FuelLog', 'org-a')).toEqual({ vehicle: { organizationId: 'org-a' } });
    expect(organizationScope('Passenger', 'org-a')).toEqual({
      passengerList: { contract: { organizationId: 'org-a' } },
    });
  });

  it('has a scope for every exported entity and refuses unknown models', () => {
    for (const item of exportDatasets()) {
      expect(() => organizationScope(item.model, 'org-a')).not.toThrow();
    }
    expect(() => organizationScope('User', 'org-a')).toThrow();
  });
});

describe('prepareOrganizationExport', () => {
  it('names the zip after the organization and the day', async () => {
    tables.organization = [{ id: 'org-a', name: 'Sređeni Prevoz d.o.o.' } as Row];

    await expect(
      prepareOrganizationExport('org-a', new Date('2026-11-09T12:00:00Z')),
    ).resolves.toEqual({ fileName: 'firma-sredjeni-prevoz-d-o-o-2026-11-09.zip' });
  });

  it('returns 404 for an unknown organization', async () => {
    await expect(prepareOrganizationExport('nope')).rejects.toMatchObject({ statusCode: 404 });
  });
});
