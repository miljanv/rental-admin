import {
  COMPANY,
  PAYMENT_METHOD_LABELS,
  TRANSACTION_CATEGORY_LABELS,
  TRANSACTION_SOURCE_TYPE_LABELS,
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
  type FinanceExportQueryRequest,
  type FinanceReportDto,
  type TransactionDto,
  type TransactionVehicleDto,
  type UnsettledAdvancesDto,
} from '@rental-admin/shared';

import { formatSerbianDate } from './pdf/format';
import type { XlsxCell, XlsxSheet } from '../utils/xlsx';

export const FINANCE_EXPORT_LEDGER_LIMIT = 10_000;

export interface FinanceExportTable {
  title: string;
  sheetName: string;
  headers: string[];
  rows: XlsxCell[][];
}

export interface FinanceExportDocument {
  fileStem: string;
  title: string;
  company: string;
  periodLabel: string;
  filterSummary: string;
  truncated: boolean;
  tables: FinanceExportTable[];
}

const MONTH_NAMES = [
  'januar',
  'februar',
  'mart',
  'april',
  'maj',
  'jun',
  'jul',
  'avgust',
  'septembar',
  'oktobar',
  'novembar',
  'decembar',
] as const;

export const vehicleExportLabel = (vehicle: TransactionVehicleDto | null): string =>
  vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})` : 'Bez vozila';

const driverExportLabel = (transaction: TransactionDto): string =>
  transaction.driver ? `${transaction.driver.firstName} ${transaction.driver.lastName}` : '';

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const filterParts = (query: Partial<Omit<FinanceExportQueryRequest, 'format'>>): string[] => {
  const parts: string[] = [];

  if (query.type) {
    parts.push(`Tip: ${TRANSACTION_TYPE_LABELS[query.type]}`);
  }

  if (query.category) {
    parts.push(`Kategorija: ${TRANSACTION_CATEGORY_LABELS[query.category]}`);
  }

  if (query.paymentMethod) {
    parts.push(`Plaćanje: ${PAYMENT_METHOD_LABELS[query.paymentMethod]}`);
  }

  if (query.status) {
    parts.push(`Status: ${TRANSACTION_STATUS_LABELS[query.status]}`);
  }

  if (query.isAdvance !== undefined) {
    parts.push(query.isAdvance ? 'Samo avansi' : 'Bez avansa');
  }

  if (query.supplier) {
    parts.push(`Dobavljač: ${query.supplier}`);
  }

  if (query.search) {
    parts.push(`Pretraga: ${query.search}`);
  }

  return parts;
};

export const buildFinanceExportDocument = (input: {
  report: FinanceReportDto;
  transactions: TransactionDto[];
  advances: UnsettledAdvancesDto;
  query: Partial<Omit<FinanceExportQueryRequest, 'format'>>;
  truncated: boolean;
}): FinanceExportDocument => {
  const { report, transactions, advances, query, truncated } = input;
  const filters = filterParts(query);
  const periodLabel = `${formatSerbianDate(report.from)} – ${formatSerbianDate(report.to)}`;

  const tables: FinanceExportTable[] = [
    {
      title: 'Ukupno',
      sheetName: 'Pregled',
      headers: ['Pokazatelj', 'Iznos', 'Knjiženja'],
      rows: [
        ['Prihod', roundMoney(report.totals.income), report.totals.count],
        ['Rashod', roundMoney(report.totals.expense), null],
        ['Profit', roundMoney(report.totals.profit), null],
      ],
    },
    {
      title: 'Prihod i rashod po mesecima',
      sheetName: 'Meseci',
      headers: [
        'Mesec',
        'Prihod',
        'Rashod',
        'Profit',
        'Račun prihod',
        'Račun rashod',
        'Keš prihod',
        'Keš rashod',
      ],
      rows: report.monthly.map((point) => {
        const account = point.byPaymentMethod.find((item) => item.paymentMethod === 'ACCOUNT');
        const cash = point.byPaymentMethod.find((item) => item.paymentMethod === 'CASH');
        const monthName = MONTH_NAMES[point.month - 1] ?? String(point.month);

        return [
          `${monthName} ${point.year}`,
          roundMoney(point.income),
          roundMoney(point.expense),
          roundMoney(point.profit),
          roundMoney(account?.income ?? 0),
          roundMoney(account?.expense ?? 0),
          roundMoney(cash?.income ?? 0),
          roundMoney(cash?.expense ?? 0),
        ];
      }),
    },
    {
      title: 'Rashodi po kategoriji',
      sheetName: 'Kategorije',
      headers: ['Kategorija', 'Rashod', 'Knjiženja'],
      rows: report.byCategory.map((item) => [
        TRANSACTION_CATEGORY_LABELS[item.category],
        roundMoney(item.expense),
        item.count,
      ]),
    },
    {
      title: 'Račun vs. keš',
      sheetName: 'Nacin placanja',
      headers: ['Način plaćanja', 'Prihod', 'Rashod', 'Profit', 'Knjiženja'],
      rows: report.byPaymentMethod.map((item) => [
        PAYMENT_METHOD_LABELS[item.paymentMethod],
        roundMoney(item.income),
        roundMoney(item.expense),
        roundMoney(item.profit),
        item.count,
      ]),
    },
    {
      title: 'Profit po vozilu',
      sheetName: 'Vozila',
      headers: ['Vozilo', 'Prihod', 'Rashod', 'Profit', 'Knjiženja'],
      rows: report.byVehicle.map((item) => [
        vehicleExportLabel(item.vehicle),
        roundMoney(item.income),
        roundMoney(item.expense),
        roundMoney(item.profit),
        item.count,
      ]),
    },
    {
      title: 'Profit po partneru',
      sheetName: 'Partneri',
      headers: ['Partner', 'Prihod', 'Rashod', 'Profit', 'Knjiženja'],
      rows: report.byPartner.map((item) => [
        item.partner,
        roundMoney(item.income),
        roundMoney(item.expense),
        roundMoney(item.profit),
        item.count,
      ]),
    },
    {
      title: 'Profit po relaciji',
      sheetName: 'Relacije',
      headers: ['Relacija', 'Prihod', 'Rashod', 'Profit', 'Knjiženja'],
      rows: report.byRoute.map((item) => [
        item.route,
        roundMoney(item.income),
        roundMoney(item.expense),
        roundMoney(item.profit),
        item.count,
      ]),
    },
    {
      title: 'Nerazduženi avansi',
      sheetName: 'Avansi',
      headers: ['Dobavljač', 'Iznos', 'Broj avansa'],
      rows: advances.groups.map((group) => [group.supplier, roundMoney(group.total), group.count]),
    },
    {
      title: 'Transakcije',
      sheetName: 'Transakcije',
      headers: [
        'Datum',
        'Tip',
        'Kategorija',
        'Iznos',
        'Plaćanje',
        'Dobavljač',
        'Partner',
        'Relacija',
        'Vozilo',
        'Vozač',
        'Avans',
        'Status',
        'Izvor',
        'Napomena',
      ],
      rows: transactions.map((transaction) => [
        formatSerbianDate(transaction.occurredAt),
        TRANSACTION_TYPE_LABELS[transaction.type],
        TRANSACTION_CATEGORY_LABELS[transaction.category],
        roundMoney(transaction.amount),
        PAYMENT_METHOD_LABELS[transaction.paymentMethod],
        transaction.supplier ?? '',
        transaction.partner ?? '',
        transaction.route ?? '',
        vehicleExportLabel(transaction.vehicle),
        driverExportLabel(transaction),
        transaction.isAdvance ? 'Da' : 'Ne',
        TRANSACTION_STATUS_LABELS[transaction.status],
        TRANSACTION_SOURCE_TYPE_LABELS[transaction.sourceType],
        transaction.note ?? '',
      ]),
    },
  ];

  return {
    fileStem: `finansije-${report.from}-${report.to}`,
    title: 'Finansijski izveštaj',
    company: COMPANY.legalName,
    periodLabel,
    filterSummary: filters.length > 0 ? filters.join(' · ') : 'Bez dodatnih filtera',
    truncated,
    tables,
  };
};

export const financeExportSheets = (document: FinanceExportDocument): XlsxSheet[] =>
  document.tables.map((table) => ({
    name: table.sheetName,
    rows: [
      [document.company],
      [document.title],
      [`Period: ${document.periodLabel}`],
      [`Filteri: ${document.filterSummary}`],
      document.truncated
        ? [`Lista transakcija je skraćena na ${FINANCE_EXPORT_LEDGER_LIMIT} redova.`]
        : [''],
      [],
      [table.title],
      table.headers,
      ...table.rows,
    ],
  }));

