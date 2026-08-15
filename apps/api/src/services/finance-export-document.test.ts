import { buildFinanceReport } from '@rental-admin/shared';
import { describe, expect, it } from 'vitest';

import {
  buildFinanceExportDocument,
  financeExportSheets,
} from './finance-export-document';
import { buildFinanceReportPdf } from './pdf/finance-report-pdf';
import { buildXlsx } from '../utils/xlsx';

const report = buildFinanceReport(
  [
    {
      type: 'INCOME',
      category: 'CONTRACT',
      amount: 80_000,
      occurredAt: '2026-08-10',
      paymentMethod: 'CASH',
      vehicle: { id: 'v1', make: 'Setra', model: 'S 516', licensePlate: 'NS-001-AA' },
      partner: 'Agencija Dunav',
      route: 'NS–BG',
    },
    {
      type: 'EXPENSE',
      category: 'FUEL',
      amount: 20_000,
      occurredAt: '2026-08-11',
      paymentMethod: 'ACCOUNT',
      vehicle: { id: 'v1', make: 'Setra', model: 'S 516', licensePlate: 'NS-001-AA' },
      partner: null,
      route: 'NS–BG',
    },
  ],
  '2026-08-01',
  '2026-08-31',
);

const document = buildFinanceExportDocument({
  report,
  truncated: false,
  query: {},
  advances: {
    groups: [{ supplier: 'OMV', total: 15_000, count: 1, advances: [] }],
  },
  transactions: [
    {
      id: 'tx1',
      type: 'INCOME',
      category: 'CONTRACT',
      amount: 80_000,
      occurredAt: '2026-08-10',
      paymentMethod: 'CASH',
      note: null,
      supplier: null,
      partner: 'Agencija Dunav',
      route: 'NS–BG',
      vehicle: { id: 'v1', make: 'Setra', model: 'S 516', licensePlate: 'NS-001-AA' },
      driver: null,
      contractId: null,
      isAdvance: false,
      status: 'OPEN',
      linkedTransactionId: null,
      sourceType: 'MANUAL',
      sourceId: null,
      createdAt: '2026-08-10T10:00:00.000Z',
      updatedAt: '2026-08-10T10:00:00.000Z',
    },
  ],
});

describe('buildFinanceExportDocument', () => {
  it('builds tables for every finance report section', () => {
    expect(document.tables.map((table) => table.sheetName)).toEqual([
      'Pregled',
      'Meseci',
      'Kategorije',
      'Nacin placanja',
      'Vozila',
      'Partneri',
      'Relacije',
      'Avansi',
      'Transakcije',
    ]);
    expect(document.periodLabel).toContain('01.08.2026.');
    expect(document.tables[0]?.rows[0]?.[1]).toBe(80_000);
    expect(document.tables[3]?.rows.find((row) => row[0] === 'Keš')?.[1]).toBe(80_000);
  });
});

describe('finance export files', () => {
  it('embeds report values in the Excel workbook', () => {
    const buffer = buildXlsx(financeExportSheets(document));
    const body = buffer.toString('utf8');

    expect(buffer.subarray(0, 2).toString('latin1')).toBe('PK');
    expect(body).toContain('Agencija Dunav');
    expect(body).toContain('80000');
    expect(body).toContain('OMV');
  });

  it('builds a landscape PDF with at least one page', async () => {
    const buffer = await buildFinanceReportPdf(document);

    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(1_000);
  });
});
