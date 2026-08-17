import { COMPANY, PAYMENT_METHOD_LABELS, TRIP_BILLING_DOCUMENT_TYPE_LABELS } from '@rental-admin/shared';
import type { PaymentMethod, TripBillingDocumentType } from '@rental-admin/shared';
import { rgb, type PDFFont } from 'pdf-lib';

import { formatSerbianDate, formatSerbianMoney } from './format';
import { createPdf, embedCompanyStamp, toBuffer, wrapLines } from './overlay';

export interface TripBillingDocumentPdfInput {
  type: TripBillingDocumentType;
  documentNumber: string;
  issuedAt: string;
  clientName: string;
  clientAddress: string | null;
  clientTaxId: string | null;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string | null;
  passengerCount: number | null;
  notes: string | null;
  vehiclePlates: string[];
  price: number | null;
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
}

const PAGE_W = 595.3;
const PAGE_H = 841.89;
const LEFT = 56.8;
const RIGHT = 538.5;
const WIDTH = RIGHT - LEFT;
const TOP = 785;
const BLACK = rgb(0, 0, 0);
const MUTED = rgb(0.35, 0.36, 0.38);
const RULE = rgb(0.82, 0.83, 0.85);

/**
 * An internal record-keeping PDF — not a fiscal document. If real
 * fiscalization (SEF e-fakture / fiskalna kasa) is ever required, that's a
 * separate integration and this document should not be mistaken for it.
 */
export const buildTripBillingDocumentPdf = async (
  input: TripBillingDocumentPdfInput,
): Promise<Buffer> => {
  const { pdf, fonts } = await createPdf();
  const stamp = await embedCompanyStamp(pdf);
  const { serif: body, serifBold: bold } = fonts;

  const page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = TOP;

  const text = (value: string, x: number, size: number, font: PDFFont, color = BLACK): void => {
    page.drawText(value, { x, y, size, font, color });
  };

  const advance = (step: number): void => {
    y -= step;
  };

  const rule = (): void => {
    page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT, y }, thickness: 0.5, color: RULE });
    advance(14);
  };

  const paragraph = (value: string, font: PDFFont = body, size = 10, color = BLACK): void => {
    for (const line of wrapLines(font, value, size, WIDTH)) {
      text(line, LEFT, size, font, color);
      advance(size + 4);
    }
  };

  const labeledLine = (label: string, value: string): void => {
    text(label, LEFT, 10, bold);
    text(value, LEFT + 130, 10, body);
    advance(16);
  };

  // Letterhead.
  text(COMPANY.legalName, LEFT, 16, bold);
  advance(18);
  paragraph(`${COMPANY.streetAddress}, ${COMPANY.postalCode} ${COMPANY.city}, ${COMPANY.country}`, body, 9, MUTED);
  paragraph(`PIB: ${COMPANY.pib} · Matični broj: ${COMPANY.registrationNumber}`, body, 9, MUTED);
  paragraph(`Tel: ${COMPANY.phoneIntl} · Email: ${COMPANY.email}`, body, 9, MUTED);
  advance(10);
  rule();

  // Title.
  const title = `${TRIP_BILLING_DOCUMENT_TYPE_LABELS[input.type]} br. ${input.documentNumber}`;
  text(title, LEFT, 14, bold);
  advance(20);
  labeledLine('Datum izdavanja:', formatSerbianDate(input.issuedAt));

  if (input.type === 'PREDRACUN') {
    labeledLine('Rok važenja ponude:', '15 dana od datuma izdavanja');
  } else {
    labeledLine('Status naplate:', input.paidAt ? `Naplaćeno ${formatSerbianDate(input.paidAt)}` : 'Nije naplaćeno');
  }

  advance(6);
  rule();

  // Client.
  text('Naručilac', LEFT, 11, bold);
  advance(16);
  labeledLine('Naziv / ime:', input.clientName || '—');
  if (input.clientAddress) {
    labeledLine('Adresa:', input.clientAddress);
  }
  if (input.clientTaxId) {
    labeledLine('PIB / JMBG:', input.clientTaxId);
  }

  advance(6);
  rule();

  // Service.
  text('Usluga', LEFT, 11, bold);
  advance(16);
  labeledLine('Relacija:', `${input.origin} — ${input.destination}`);
  labeledLine(
    'Period:',
    input.returnDate
      ? `${formatSerbianDate(input.departureDate)} – ${formatSerbianDate(input.returnDate)}`
      : formatSerbianDate(input.departureDate),
  );
  if (input.passengerCount !== null) {
    labeledLine('Broj putnika:', String(input.passengerCount));
  }
  if (input.vehiclePlates.length > 0) {
    labeledLine('Vozilo:', input.vehiclePlates.join(', '));
  }
  if (input.notes) {
    text('Napomena:', LEFT, 10, bold);
    advance(14);
    paragraph(input.notes, body, 10);
  }

  advance(6);
  rule();

  // Amount.
  text('Iznos', LEFT, 11, bold);
  advance(18);
  const amountLabel = `${formatSerbianMoney(input.price ?? 0)} RSD`;
  text(amountLabel, LEFT, 14, bold);
  advance(20);
  labeledLine('Način plaćanja:', input.paymentMethod ? PAYMENT_METHOD_LABELS[input.paymentMethod] : '—');

  // Signature / stamp block, anchored near the bottom.
  const stampY = 160;
  const stampWidth = 110;
  page.drawImage(stamp, {
    x: RIGHT - stampWidth,
    y: stampY,
    width: stampWidth,
    height: stampWidth * (stamp.height / stamp.width),
  });
  page.drawLine({
    start: { x: RIGHT - 180, y: stampY - 10 },
    end: { x: RIGHT, y: stampY - 10 },
    thickness: 0.5,
    color: BLACK,
  });
  page.drawText(`${COMPANY.directorName}, ${COMPANY.directorTitle}`, {
    x: RIGHT - 180,
    y: stampY - 24,
    size: 9,
    font: body,
    color: MUTED,
  });

  return toBuffer(pdf);
};
