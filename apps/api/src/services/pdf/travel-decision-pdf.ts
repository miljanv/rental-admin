import {
  COMPANY,
  DOMESTIC_PER_DIEM_RATE_RSD,
  FOREIGN_PER_DIEM_RATE_EUR,
} from '@rental-admin/shared';
import { rgb } from 'pdf-lib';

import type { DriverRecord } from '../../utils/driver-mapper';
import { driverFullName, formatSerbianDate, formatSerbianMoney } from './format';
import { createPdf, toBuffer } from './overlay';

interface TravelDecisionPdfInput {
  driver: DriverRecord;
  trip: {
    departureDate: Date;
    returnDate: Date | null;
    country: string | null;
    origin: string;
    destination: string;
  };
  documentNumber: string;
  year: string;
  advance: number;
  isDomestic: boolean;
}

const PAGE_W = 595.27;
const PAGE_H = 841.89;
const MARGIN = 56;
const BLACK = rgb(0, 0, 0);

const wrap = (
  text: string,
  font: { widthOfTextAtSize: (value: string, size: number) => number },
  size: number,
  maxWidth: number,
): string[] => {
  const words = text.split(/\s+/u).filter(Boolean);
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

  return lines.length > 0 ? lines : [''];
};

export const buildTravelDecisionPdf = async (params: TravelDecisionPdfInput): Promise<Buffer> => {
  const { pdf, fonts } = await createPdf();
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  const maxWidth = PAGE_W - MARGIN * 2;
  let y = PAGE_H - 72;

  const drawCentered = (text: string, size: number, gap = 16): void => {
    const width = fonts.sansBold.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (PAGE_W - width) / 2,
      y,
      size,
      font: fonts.sansBold,
      color: BLACK,
    });
    y -= gap;
  };

  const drawParagraph = (text: string, size = 11): void => {
    for (const line of wrap(text, fonts.sans, size, maxWidth)) {
      page.drawText(line, { x: MARGIN, y, size, font: fonts.sans, color: BLACK });
      y -= size + 4;
    }
    y -= 8;
  };

  drawCentered('ODLUKA O UPUĆIVANJU ZAPOSLENOG NA', 13, 18);
  drawCentered(
    params.isDomestic ? 'SLUŽBENO PUTOVANJE U ZEMLJI' : 'SLUŽBENO PUTOVANJE U INOSTRANSTVO',
    13,
    28,
  );

  page.drawText(`Broj: ${params.documentNumber}/${params.year}`, {
    x: MARGIN,
    y,
    size: 11,
    font: fonts.sans,
    color: BLACK,
  });
  y -= 28;

  const name = driverFullName(params.driver).toUpperCase();
  const country = (params.trip.country ?? 'Srbija').toUpperCase();
  const departure = formatSerbianDate(params.trip.departureDate.toISOString().slice(0, 10));
  const returnDate = formatSerbianDate(
    (params.trip.returnDate ?? params.trip.departureDate).toISOString().slice(0, 10),
  );

  drawParagraph(
    `Po odluci direktora ${COMPANY.legalName}, ${COMPANY.directorName}, upućuje se zaposleni ${name} na službeno putovanje u ${country}, dana ${departure} godine sa povratkom ${returnDate} godine. Cilj putovanja je ${params.driver.jobTitle.toUpperCase()}. Relacija: ${params.trip.origin} – ${params.trip.destination}.`,
  );

  if (params.isDomestic) {
    drawParagraph(
      `Zaposlenom ${name} pripada akontacija za službeno putovanje u zemlji ${formatSerbianMoney(params.advance)} RSD. Visina dnevnice u zemlji (Srbiji) iznosi ${formatSerbianMoney(DOMESTIC_PER_DIEM_RATE_RSD)} din (neoporezivi deo).`,
    );
  } else {
    drawParagraph(
      `Zaposlenom ${name} pripada akontacija za službeno putovanje u inostranstvo ${params.advance} EURA. Visina dnevnice u inostranstvu iznosi ${FOREIGN_PER_DIEM_RATE_EUR},00 e (eura) neoporezivo, a visina dnevnice u zemlji (Srbiji) iznosi ${formatSerbianMoney(DOMESTIC_PER_DIEM_RATE_RSD)} din.`,
    );
  }

  drawParagraph(
    `Troškovi za službeno putovanje padaju na teret ${COMPANY.legalName} iz ${COMPANY.city} uz prilaganje računa upućenog radnika na službeno putovanje.`,
  );

  y -= 24;
  page.drawText(COMPANY.legalName, {
    x: PAGE_W - MARGIN - fonts.sans.widthOfTextAtSize(COMPANY.legalName, 11),
    y,
    size: 11,
    font: fonts.sans,
    color: BLACK,
  });
  y -= 36;
  const sign = `(Dir. ${COMPANY.directorName})`;
  page.drawText(sign, {
    x: PAGE_W - MARGIN - fonts.sans.widthOfTextAtSize(sign, 10),
    y,
    size: 10,
    font: fonts.sans,
    color: BLACK,
  });

  y = 72;
  page.drawText(
    `${COMPANY.legalName}, ${COMPANY.country}, ${COMPANY.postalCode} ${COMPANY.city}, ${COMPANY.streetAddressShort}`,
    { x: MARGIN, y, size: 8, font: fonts.sans, color: BLACK },
  );
  y -= 12;
  page.drawText(`PIB: ${COMPANY.pib}, Matični broj: ${COMPANY.registrationNumber}`, {
    x: MARGIN,
    y,
    size: 8,
    font: fonts.sans,
    color: BLACK,
  });

  return toBuffer(pdf);
};
