import { Prisma } from '../generated/prisma/client';

/** Lets Excel detect UTF-8, so č, ć, ž, š and đ show correctly. */
export const CSV_BOM = '\uFEFF';
export const CSV_SEPARATOR = ';';
const LINE_END = '\r\n';

/** Excel runs a cell starting with one of these as a formula. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

const formatCsvValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Prisma.Decimal.isDecimal(value)) {
    return (value as Prisma.Decimal).toFixed();
  }

  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value === 'string') {
    return FORMULA_PREFIX.test(value) ? `'${value}` : value;
  }

  return JSON.stringify(value);
};

const escapeCsvCell = (text: string): string =>
  /[";\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;

/** One line: dates ISO, amounts with a dot, `;` between cells. */
export const toCsvLine = (values: readonly unknown[]): string =>
  values.map((value) => escapeCsvCell(formatCsvValue(value))).join(CSV_SEPARATOR) + LINE_END;
