import { rgb, type PDFFont, type PDFPage } from 'pdf-lib';

import { createPdf, toBuffer } from './overlay';
import { formatSerbianMoney } from './format';
import {
  FINANCE_EXPORT_LEDGER_LIMIT,
  type FinanceExportDocument,
  type FinanceExportTable,
} from '../finance-export-document';

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.27;
const MARGIN = 36;
const TITLE_SIZE = 14;
const META_SIZE = 9;
const CELL_SIZE = 8;
const ROW_HEIGHT = 14;
const HEADER_HEIGHT = 16;
const USABLE_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BLACK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.35, 0.36, 0.38);
const RULE = rgb(0.82, 0.83, 0.85);
const HEADER_FILL = rgb(0.93, 0.94, 0.95);

const fitText = (text: string, font: PDFFont, size: number, maxWidth: number): string => {
  if (maxWidth <= 0) {
    return '';
  }

  if (font.widthOfTextAtSize(text, size) <= maxWidth) {
    return text;
  }

  let truncated = text;

  while (truncated.length > 0 && font.widthOfTextAtSize(`${truncated}…`, size) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }

  return truncated ? `${truncated}…` : '';
};

const columnWidths = (columnCount: number): number[] => {
  if (columnCount <= 0) {
    return [];
  }

  const firstShare = columnCount >= 6 ? 0.18 : 0.28;
  const restShare = (1 - firstShare) / Math.max(1, columnCount - 1);
  const first = USABLE_WIDTH * firstShare;
  const rest = USABLE_WIDTH * restShare;

  return Array.from({ length: columnCount }, (_, index) => (index === 0 ? first : rest));
};

const cellText = (value: string | number | boolean | null): string => {
  if (value === null) {
    return '';
  }

  if (typeof value === 'number') {
    return formatSerbianMoney(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Da' : 'Ne';
  }

  return value;
};

interface PageState {
  page: PDFPage;
  y: number;
  pageNumber: number;
}

const buildFinanceReportPdf = async (document: FinanceExportDocument): Promise<Buffer> => {
  const { pdf, fonts } = await createPdf();
  const pages: PDFPage[] = [];

  const drawFooter = (page: PDFPage, pageNumber: number): void => {
    page.drawText(`Strana ${pageNumber}`, {
      x: PAGE_WIDTH - MARGIN - fonts.sans.widthOfTextAtSize(`Strana ${pageNumber}`, 8),
      y: 18,
      size: 8,
      font: fonts.sans,
      color: MUTED,
    });
  };

  const startPage = (state: PageState | null): PageState => {
    if (state) {
      drawFooter(state.page, state.pageNumber);
    }

    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    const pageNumber = pages.length;
    let y = PAGE_HEIGHT - MARGIN;

    page.drawText(document.company, {
      x: MARGIN,
      y,
      size: TITLE_SIZE,
      font: fonts.sansBold,
      color: BLACK,
    });
    y -= 18;
    page.drawText(document.title, {
      x: MARGIN,
      y,
      size: 11,
      font: fonts.sansBold,
      color: BLACK,
    });
    y -= 14;
    page.drawText(`Period: ${document.periodLabel}`, {
      x: MARGIN,
      y,
      size: META_SIZE,
      font: fonts.sans,
      color: MUTED,
    });
    y -= 12;
    page.drawText(`Filteri: ${document.filterSummary}`, {
      x: MARGIN,
      y,
      size: META_SIZE,
      font: fonts.sans,
      color: MUTED,
    });
    y -= 12;

    if (document.truncated) {
      page.drawText(`Lista transakcija je skraćena na ${FINANCE_EXPORT_LEDGER_LIMIT} redova.`, {
        x: MARGIN,
        y,
        size: META_SIZE,
        font: fonts.sans,
        color: MUTED,
      });
      y -= 12;
    }

    y -= 8;

    return { page, y, pageNumber };
  };

  let state = startPage(null);

  const ensureSpace = (needed: number): void => {
    if (state.y - needed < MARGIN + 12) {
      state = startPage(state);
    }
  };

  const drawTable = (table: FinanceExportTable): void => {
    ensureSpace(ROW_HEIGHT * 4);
    state.page.drawText(table.title, {
      x: MARGIN,
      y: state.y,
      size: 11,
      font: fonts.sansBold,
      color: BLACK,
    });
    state.y -= 18;

    const widths = columnWidths(table.headers.length);
    const isNumeric = table.headers.map(
      (header) =>
        header === 'Iznos' ||
        header === 'Prihod' ||
        header === 'Rashod' ||
        header === 'Profit' ||
        header.endsWith('prihod') ||
        header.endsWith('rashod') ||
        header === 'Knjiženja' ||
        header === 'Broj avansa',
    );

    const drawRow = (
      values: Array<string | number | boolean | null>,
      options: { header?: boolean },
    ): void => {
      ensureSpace(options.header ? HEADER_HEIGHT + 2 : ROW_HEIGHT);

      if (options.header) {
        state.page.drawRectangle({
          x: MARGIN,
          y: state.y - 4,
          width: USABLE_WIDTH,
          height: HEADER_HEIGHT,
          color: HEADER_FILL,
        });
      }

      let x = MARGIN;

      values.forEach((value, index) => {
        const width = widths[index] ?? 40;
        const text = fitText(cellText(value), fonts.sans, CELL_SIZE, width - 6);
        const numeric = isNumeric[index] === true && !options.header;
        const textWidth = fonts.sans.widthOfTextAtSize(text, CELL_SIZE);
        const textX = numeric ? x + width - 4 - textWidth : x + 3;

        state.page.drawText(text, {
          x: Math.max(x + 2, textX),
          y: state.y,
          size: CELL_SIZE,
          font: options.header ? fonts.sansBold : fonts.sans,
          color: BLACK,
        });
        x += width;
      });

      state.y -= options.header ? HEADER_HEIGHT : ROW_HEIGHT;
      state.page.drawLine({
        start: { x: MARGIN, y: state.y + 10 },
        end: { x: PAGE_WIDTH - MARGIN, y: state.y + 10 },
        thickness: 0.3,
        color: RULE,
      });
    };

    drawRow(table.headers, { header: true });

    if (table.rows.length === 0) {
      ensureSpace(ROW_HEIGHT);
      state.page.drawText('Nema podataka.', {
        x: MARGIN + 3,
        y: state.y,
        size: CELL_SIZE,
        font: fonts.sans,
        color: MUTED,
      });
      state.y -= ROW_HEIGHT * 1.5;
      return;
    }

    for (const row of table.rows) {
      drawRow(row, {});
    }

    state.y -= 10;
  };

  for (const table of document.tables) {
    drawTable(table);
  }

  drawFooter(state.page, state.pageNumber);

  return toBuffer(pdf);
};

export { buildFinanceReportPdf };
