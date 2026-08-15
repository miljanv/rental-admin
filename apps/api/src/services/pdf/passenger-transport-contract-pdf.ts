import {
  COMPANY,
  PARTNER_TYPE_LABELS,
  computeAdvanceAmount,
  computeRemainderAmount,
  contractClientDisplayName,
  isLegalEntityPartnerType,
} from '@rental-admin/shared';
import { rgb, type PDFFont } from 'pdf-lib';

import type { ContractRecord } from '../../utils/contract-mapper';
import type { DriverRecord } from '../../utils/driver-mapper';
import type { VehicleRecord } from '../../utils/vehicle-mapper';
import { formatSerbianDate, formatSerbianMoney } from './format';
import { createPdf, embedCompanyStamp, toBuffer, wrapLines } from './overlay';

interface PassengerTransportContractPdfInput {
  contract: ContractRecord;
  vehicle: VehicleRecord | null;
  driver: DriverRecord | null;
}

const PAGE_W = 595.3;
const PAGE_H = 841.89;
const LEFT = 56.8;
const RIGHT = 538.5;
const WIDTH = RIGHT - LEFT;
const TOP = 785;
const BOTTOM = 92;
const BODY_SIZE = 10;
const LEAD = 14;
const BLACK = rgb(0, 0, 0);

const isoDate = (value: Date): string => value.toISOString();

/**
 * Unlike the employment contract / MA form (fixed, known-length legal text on
 * a fixed number of pages), this contract's body length varies with the
 * route, client identity, and optional notes — so the cursor here tracks its
 * own y-position and breaks to a new page on demand instead of relying on
 * hardcoded coordinates.
 */
export const buildPassengerTransportContractPdf = async (
  params: PassengerTransportContractPdfInput,
): Promise<Buffer> => {
  const { contract, vehicle, driver } = params;
  const { pdf, fonts } = await createPdf();
  const stamp = await embedCompanyStamp(pdf);
  const { serif: body, serifBold: bold, serifBoldItalic: boldItalic } = fonts;

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = TOP;
  let articleNumber = 1;

  const newPage = (): void => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = TOP;
  };

  const ensure = (needed: number): void => {
    if (y - needed < BOTTOM) {
      newPage();
    }
  };

  const text = (value: string, x: number, size: number, font: PDFFont): void => {
    page.drawText(value, { x, y, size, font, color: BLACK });
  };

  const center = (value: string, size: number, font: PDFFont): void => {
    const width = font.widthOfTextAtSize(value, size);
    text(value, (PAGE_W - width) / 2, size, font);
  };

  const advance = (step = LEAD): void => {
    y -= step;
  };

  const gap = (amount = 6): void => {
    ensure(amount);
    advance(amount);
  };

  const paragraph = (value: string, font: PDFFont = body, size = BODY_SIZE): void => {
    for (const line of wrapLines(font, value, size, WIDTH)) {
      ensure(LEAD);
      text(line, LEFT, size, font);
      advance();
    }
  };

  const heading = (title: string): void => {
    // Reserve room for the heading plus a couple of body lines, not just the
    // heading itself — otherwise a heading can be stranded alone at the
    // bottom of a page while its paragraph starts on the next one.
    ensure(LEAD * 5);
    advance(4);
    text(`Član ${articleNumber}. ${title}`, LEFT, 11, bold);
    articleNumber += 1;
    advance(LEAD + 2);
  };

  const line = (x0: number, x1: number, atY: number): void => {
    page.drawLine({ start: { x: x0, y: atY }, end: { x: x1, y: atY }, thickness: 0.6, color: BLACK });
  };

  // --- Title ---
  center('UGOVOR O PREVOZU PUTNIKA', 15, boldItalic);
  advance(26);

  // --- Preamble ---
  paragraph(`zaključen dana ${formatSerbianDate(isoDate(contract.conclusionDate))} u ${COMPANY.city}, između:`);
  gap(8);

  const carrierLine =
    `${COMPANY.legalName}, ${COMPANY.streetAddress}, ${COMPANY.postalCode} ${COMPANY.city}, ` +
    `PIB: ${COMPANY.pib}, matični broj: ${COMPANY.registrationNumber}, koga zastupa ${COMPANY.directorName}, ` +
    `${COMPANY.directorTitle} (u daljem tekstu: Prevoznik)`;
  paragraph(`1. ${carrierLine}`, bold);
  gap(4);
  paragraph('i');
  gap(4);

  const clientTypeLabel = PARTNER_TYPE_LABELS[contract.clientType];
  const clientName = contractClientDisplayName(contract);
  const clientLine = isLegalEntityPartnerType(contract.clientType)
    ? `${clientName} (${clientTypeLabel}), ${contract.clientAddress}, PIB: ${contract.clientPib ?? ''}, ` +
      `matični broj: ${contract.clientRegistrationNumber ?? ''} (u daljem tekstu: Naručilac)`
    : `${clientName}, JMBG: ${contract.clientPersonalId ?? ''}, adresa: ${contract.clientAddress} ` +
      `(u daljem tekstu: Naručilac)`;
  paragraph(`2. ${clientLine}`, bold);
  gap(4);
  paragraph('(Prevoznik i Naručilac u daljem tekstu zajednički: Ugovorne strane)');
  gap(16);

  // --- Articles ---
  heading('Predmet ugovora');
  paragraph(
    `Prevoznik se obavezuje da za potrebe Naručioca izvrši prevoz putnika na relaciji ${contract.route}, ` +
      `u periodu od ${formatSerbianDate(isoDate(contract.serviceStartDate))} do ` +
      `${formatSerbianDate(isoDate(contract.serviceEndDate))}, za grupu od ${contract.passengerCount} putnika, ` +
      `a Naručilac se obavezuje da za izvršenu uslugu plati ugovorenu cenu pod uslovima iz ovog ugovora.`,
  );

  heading('Vozilo i vozač');
  if (vehicle) {
    const driverLine = driver
      ? ` Vozilo će voziti vozač ${driver.firstName} ${driver.lastName}, br. telefona ${driver.phone}.`
      : '';
    paragraph(
      `Prevoz će biti izvršen vozilom ${vehicle.make} ${vehicle.model}, registarskih oznaka ` +
        `${vehicle.licensePlate}, kapaciteta ${vehicle.seatCount} sedišta.${driverLine}`,
    );
  } else {
    paragraph(
      'Vozilo i vozač biće naknadno određeni od strane Prevoznika, u skladu sa organizacionim ' +
        'mogućnostima, o čemu će Naručilac biti blagovremeno obavešten.',
    );
  }

  heading('Cena i način plaćanja');
  paragraph(`Ukupna cena usluge prevoza iznosi ${formatSerbianMoney(contract.price)} dinara.`);
  if (contract.advancePercentage > 0) {
    const advanceAmount = computeAdvanceAmount(contract.price, contract.advancePercentage);
    const remainderAmount = computeRemainderAmount(contract.price, contract.advancePercentage);
    paragraph(
      `Naručilac se obavezuje da prilikom zaključenja ovog ugovora uplati avans u iznosu od ` +
        `${contract.advancePercentage}% od ukupne cene, odnosno ${formatSerbianMoney(advanceAmount)} dinara, ` +
        `a preostali iznos od ${formatSerbianMoney(remainderAmount)} dinara najkasnije do dana početka usluge ` +
        `prevoza, uplatom na tekući račun Prevoznika.`,
    );
  } else {
    paragraph(
      `Naručilac se obavezuje da ukupan iznos od ${formatSerbianMoney(contract.price)} dinara isplati ` +
        `najkasnije do dana početka usluge prevoza, uplatom na tekući račun Prevoznika.`,
    );
  }

  heading('Obaveze Prevoznika');
  paragraph(
    'Prevoznik se obavezuje da: obezbedi tehnički ispravno i uredno registrovano vozilo i vozača sa ' +
      'važećom vozačkom dozvolom odgovarajuće kategorije; izvrši prevoz u dogovorenom terminu i na ' +
      'dogovorenoj relaciji; poštuje propise o bezbednosti saobraćaja i prevozu putnika; blagovremeno ' +
      'obavesti Naručioca o svakoj okolnosti koja utiče na izvršenje usluge.',
  );

  heading('Obaveze Naručioca');
  paragraph(
    'Naručilac se obavezuje da: dostavi Prevozniku tačan broj putnika i sve podatke potrebne za ' +
      'organizaciju prevoza; izvrši uplatu u skladu sa članom 3. ovog ugovora; obezbedi da se putnici ' +
      'pridržavaju kućnog reda vozila i uputstava vozača.',
  );

  heading('Otkazivanje i raskid ugovora');
  paragraph(
    'Naručilac može otkazati uslugu pisanim putem, s tim da u slučaju otkazivanja manje od 48 časova pre ' +
      'početka usluge, uplaćeni avans zadržava Prevoznik na ime nastalih troškova organizacije prevoza. ' +
      'Prevoznik zadržava pravo otkazivanja usluge usled tehničke neispravnosti vozila, više sile ili ' +
      'drugih objektivnih okolnosti, u kom slučaju je dužan da Naručiocu vrati celokupan uplaćeni iznos.',
  );

  heading('Viša sila');
  paragraph(
    'Nijedna ugovorna strana ne odgovara za neizvršenje ili zakašnjenje u izvršenju obaveza iz ovog ' +
      'ugovora ukoliko je do njega došlo usled dejstva više sile.',
  );

  heading('Rešavanje sporova');
  paragraph(
    `Sve eventualne sporove povodom ovog ugovora Ugovorne strane će pokušati da reše sporazumno, a ` +
      `ukoliko u tome ne uspeju, ugovara se nadležnost stvarno nadležnog suda u ${COMPANY.city}.`,
  );

  if (contract.notes) {
    heading('Napomena');
    paragraph(contract.notes);
  }

  heading('Završne odredbe');
  paragraph(
    'Ovaj ugovor je sačinjen u 2 (dva) istovetna primerka, od kojih svaka ugovorna strana zadržava po ' +
      'jedan primerak. Ugovor stupa na snagu danom potpisivanja od strane obe ugovorne strane.',
  );

  // --- Signatures ---
  ensure(150);
  gap(28);
  text(`U ${COMPANY.city}, ${formatSerbianDate(isoDate(contract.conclusionDate))}`, LEFT, BODY_SIZE, body);
  advance(LEAD * 3);

  text('Za Prevoznika:', LEFT, BODY_SIZE, bold);
  text('Za Naručioca:', LEFT + 280, BODY_SIZE, bold);
  advance(LEAD * 3.2);

  const signatureLineY = y;
  line(LEFT, LEFT + 200, signatureLineY);
  line(LEFT + 280, LEFT + 480, signatureLineY);
  advance(12);

  text(`${COMPANY.directorName}, ${COMPANY.directorTitle}`, LEFT, 9, body);
  text(clientName, LEFT + 280, 9, body);
  advance(10);
  text('(M.P.)', LEFT, 9, body);

  page.drawImage(stamp, { x: LEFT + 6, y: signatureLineY - 22, width: 150, height: 135 });

  return toBuffer(pdf);
};
