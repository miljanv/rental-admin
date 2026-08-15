import fs from 'node:fs';

import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

import { FONT_PATHS, TEMPLATE_PATHS, assertPdfAssetsExist } from './fonts';

export interface PdfFonts {
  sans: PDFFont;
  sansBold: PDFFont;
  serif: PDFFont;
  serifItalic: PDFFont;
  serifBold: PDFFont;
  serifBoldItalic: PDFFont;
}

const PAGE_HEIGHT = 841.89;

export const loadTemplate = async (name: 'maForm'): Promise<PDFDocument> => {
  assertPdfAssetsExist();
  const pdf = await PDFDocument.load(fs.readFileSync(TEMPLATE_PATHS[name]), {
    ignoreEncryption: true,
  });
  pdf.registerFontkit(fontkit);
  return pdf;
};

export const createPdf = async (): Promise<{ pdf: PDFDocument; fonts: PdfFonts }> => {
  assertPdfAssetsExist();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  return { pdf, fonts: await embedFonts(pdf) };
};

export const embedFonts = async (pdf: PDFDocument): Promise<PdfFonts> => ({
  sans: await pdf.embedFont(fs.readFileSync(FONT_PATHS.sansRegular), { subset: true }),
  sansBold: await pdf.embedFont(fs.readFileSync(FONT_PATHS.sansBold), { subset: true }),
  serif: await pdf.embedFont(fs.readFileSync(FONT_PATHS.serifRegular), { subset: true }),
  serifItalic: await pdf.embedFont(fs.readFileSync(FONT_PATHS.serifItalic), { subset: true }),
  serifBold: await pdf.embedFont(fs.readFileSync(FONT_PATHS.serifBold), { subset: true }),
  serifBoldItalic: await pdf.embedFont(fs.readFileSync(FONT_PATHS.serifBoldItalic), { subset: true }),
});

export const embedCompanyStamp = async (pdf: PDFDocument) =>
  pdf.embedPng(fs.readFileSync(TEMPLATE_PATHS.companyStamp));

export const toBuffer = async (pdf: PDFDocument): Promise<Buffer> =>
  Buffer.from(await pdf.save());

export const fromTop = (y1: number, pageHeight = PAGE_HEIGHT): number => pageHeight - y1;

export const drawAt = (
  page: PDFPage,
  text: string,
  x: number,
  y1: number,
  size: number,
  font: PDFFont,
): void => {
  if (!text) {
    return;
  }

  page.drawText(text, { x, y: fromTop(y1, page.getHeight()), size, font, color: rgb(0, 0, 0) });
};

export const drawUnderline = (page: PDFPage, x0: number, x1: number, y1: number): void => {
  const y = fromTop(y1, page.getHeight());
  page.drawLine({
    start: { x: x0, y },
    end: { x: x1, y },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });
};

export const strikeAt = (page: PDFPage, x: number, y1: number, width: number, size: number): void => {
  const y = fromTop(y1, page.getHeight()) + size * 0.35;
  page.drawLine({
    start: { x, y },
    end: { x: x + width, y },
    thickness: 0.7,
    color: rgb(0, 0, 0),
  });
};

export const wrapLines = (font: PDFFont, text: string, size: number, maxWidth: number): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) {
        lines.push(current);
      }
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
};
