import {
  COMPANY,
  type AbsenceReason,
  type GenerateAbsenceAttestationRequest,
} from '@rental-admin/shared';
import { rgb, type PDFFont } from 'pdf-lib';

import type { DriverRecord } from '../../utils/driver-mapper';
import { driverFullName, formatAetrDateTime, formatSerbianDate } from './format';
import { createPdf, embedCompanyStamp, toBuffer } from './overlay';

interface AbsenceAttestationPdfInput {
  driver: DriverRecord;
  input: GenerateAbsenceAttestationRequest;
}

const PAGE_W = 595.27;
const PAGE_H = 841.89;
const LEFT = 36;
const RIGHT = 559;
const BOX_TOP = 698;
const BOX_BOTTOM = 176;
const PAD = 6;
const NUM_X = LEFT + PAD;
const TEXT_X = LEFT + 28;
const BODY = 9;
const VALUE = 10;
const LEAD = 15.5;
const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.2, 0.2, 0.2);
const BOX = '□';

const REASONS: { reason: AbsenceReason | 'EXEMPT' | 'AVAILABLE'; text: string }[] = [
  { reason: 'SICK_LEAVE', text: 'was on sick leave* / bio na bolovanju*' },
  { reason: 'ANNUAL_LEAVE', text: 'was on annual leave* / koristio godišnji odmor*' },
  {
    reason: 'LEAVE_OR_REST',
    text: 'was on leave or rest* / odsustvovao sa posla ili koristio slobodne dane*',
  },
  {
    reason: 'EXEMPT',
    text: 'drove a vehicle exempted from the scope of the Regulation(EC) 561/2006 or the AETR*/ upravljao vozilom koje nije iz oblasti AETR-a*',
  },
  {
    reason: 'OTHER',
    text: 'performed other work than driving* / obavljao druge poslove osim upravljanja vozilom*',
  },
  { reason: 'AVAILABLE', text: 'was available* / bio raspoloživ*' },
];

const wrapLines = (value: string, used: PDFFont, size: number, maxWidth: number): string[] => {
  const words = value.split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (used.widthOfTextAtSize(next, size) <= maxWidth) {
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

export const buildAbsenceAttestationPdf = async (
  params: AbsenceAttestationPdfInput,
): Promise<Buffer> => {
  const { driver, input } = params;
  const { pdf, fonts } = await createPdf();
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  const stamp = await embedCompanyStamp(pdf);
  const name = driverFullName(driver);
  const { serif: font, serifBold: bold, serifItalic: italic, serifBoldItalic: boldItalic } = fonts;

  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    used: PDFFont,
    color = BLACK,
  ): void => {
    page.drawText(value, { x, y, size, font: used, color });
  };

  const center = (value: string, y: number, size: number, used: PDFFont, color = BLACK): void => {
    const width = used.widthOfTextAtSize(value, size);
    text(value, (PAGE_W - width) / 2, y, size, used, color);
  };

  const right = (value: string, y: number, size = VALUE, used: PDFFont = font): void => {
    const width = used.widthOfTextAtSize(value, size);
    text(value, RIGHT - PAD - width, y, size, used);
  };

  const centerWrapped = (
    value: string,
    y: number,
    size: number,
    used: PDFFont,
    lineHeight: number,
  ): number => {
    const lines = wrapLines(value, used, size, RIGHT - LEFT);
    lines.forEach((line, index) => {
      center(line, y - index * lineHeight, size, used);
    });
    return y - (lines.length - 1) * lineHeight;
  };

  const titleSize = 11;
  const titleLeft = 'ATTESTATION OF ACTIVITIES';
  const titleRight = ' / FORMULAIRE D’ATTESTATION D’ACTIVITÉS';
  const starWidth = boldItalic.widthOfTextAtSize('*', 8);
  const titleWidth = boldItalic.widthOfTextAtSize(titleLeft, titleSize);
  const titleX =
    (PAGE_W - (titleWidth + starWidth + boldItalic.widthOfTextAtSize(titleRight, titleSize))) / 2;
  text(titleLeft, titleX, 812, titleSize, boldItalic);
  text('*', titleX + titleWidth, 817, 8, boldItalic);
  text(titleRight, titleX + titleWidth + starWidth, 812, titleSize, boldItalic);

  center(
    '(REGULATION (EC) 561/2006 OR THE AETR)/( RČGLEMENT (CE) 561/2006 OU L’AETER)',
    795,
    10,
    italic,
    GRAY,
  );
  center('POTVRDA O ODSUSTVOVANJU VOZAČA', 776, 12, boldItalic, GRAY);

  let headerY = 760;
  headerY = centerWrapped(
    'To be filled in by typing in Latin characters and signed before a journey / Popunjava se u štampanom obliku i potpisuje pre početka putovanja',
    headerY,
    9,
    italic,
    12,
  );
  headerY -= 14;
  headerY = centerWrapped(
    'To be kept with the original control device records wherever they are required to be kept / Čuva se uz originalni tahografski listić ili ispis iz digitalnog tahografa',
    headerY,
    9,
    italic,
    12,
  );
  headerY -= 14;
  center(
    'False attestations constitute an infringement / Unos netačnih podataka u potvrdu predstavlja prekršaj',
    headerY,
    9,
    italic,
  );

  page.drawRectangle({
    x: LEFT,
    y: BOX_BOTTOM,
    width: RIGHT - LEFT,
    height: BOX_TOP - BOX_BOTTOM,
    borderColor: BLACK,
    borderWidth: 1.5,
  });

  let y = BOX_TOP - 16;

  const line = (step = LEAD): void => {
    y -= step;
  };

  const wrapped = (
    value: string,
    x: number,
    size: number,
    used: PDFFont,
    width = RIGHT - PAD - x,
  ): void => {
    const lines = wrapLines(value, used, size, width);
    lines.forEach((entry, index) => {
      if (index > 0) {
        line();
      }
      text(entry, x, y, size, used);
    });
  };

  const field = (num: string, label: string, value: string): void => {
    text(num, NUM_X, y, BODY, font);
    text(label, TEXT_X, y, BODY, font);
    if (value) {
      const labelEnd = TEXT_X + font.widthOfTextAtSize(label, BODY) + 8;
      const valueWidth = font.widthOfTextAtSize(value, VALUE);
      const valueX = RIGHT - PAD - valueWidth;
      text(value, Math.max(labelEnd, valueX), y, VALUE, font);
    }
    line();
  };

  text('Part to be filled in by the undertaking / Popunjava prevoznik:', NUM_X, y, BODY, bold);
  line();

  field('1.', 'Name of the undertaking / Naziv preduzeća / preduzetnika:', COMPANY.legalName);
  field(
    '2.',
    'Street address, postal code, city / Ulica, poštanski broj, grad:',
    `${COMPANY.streetAddressShort}, ${COMPANY.postalCode} ${COMPANY.city}, Srbija`,
  );
  line(10);

  const country = `Country / Država: ${COMPANY.countryEn}/ ${COMPANY.country}`;
  const countryWidth = font.widthOfTextAtSize(country, BODY) + 14;
  const countryX = (PAGE_W - countryWidth) / 2;
  page.drawRectangle({
    x: countryX,
    y: y - 3,
    width: countryWidth,
    height: 14,
    borderColor: BLACK,
    borderWidth: 0.7,
  });
  text(country, countryX + 7, y, BODY, font);
  line();
  line(12);

  field(
    '3.',
    'Telephone number (including international prefix) / Broj telefona:',
    COMPANY.phoneIntl,
  );
  field('4.', 'Fax number (including international prefix) / Broj faxa:', COMPANY.phoneIntl);
  field('5.', 'Adresse courier electronique / Adresa elektronske pošte:', COMPANY.email);

  text('I, the undersigned / Ja dole potpisani:', TEXT_X, y, BODY, bold);
  line();

  field('6.', 'Name and first name / Ime i prezime:', COMPANY.directorName);
  field('7.', 'Position in the undertaking / na random mestu u preduzeću:', COMPANY.directorTitle);

  text('declare that the driver / izjavljujem da je vozač:', TEXT_X, y, BODY, bold);
  line();

  field('8.', 'Name and first name / Ime i prezime vozača:', name);

  text(
    'Date of birth (day/month/year) / Datum rođenja (dan, mesec, godina):',
    TEXT_X,
    y,
    BODY,
    font,
  );
  right(formatSerbianDate(driver.dateOfBirth.toISOString()), y);
  line();

  text('10.', NUM_X, y, BODY, font);
  wrapped(
    'Driving licence or identity card or passport number / Broj vožačke dozvole, lične karte ili pasoša',
    TEXT_X,
    BODY,
    font,
  );
  line();
  text(`Br. vozačke dozvole: ${driver.drivingLicenseNumber}`, TEXT_X, y, BODY, font);
  text(`Br. lične karte: ${driver.idCardNumber}`, LEFT + 210, y, BODY, font);
  text(`Br. pasoša: ${input.passportNumber ?? ''}`, LEFT + 390, y, BODY, font);
  line();

  text('11.', NUM_X, y, BODY, font);
  wrapped(
    `who has started to work at the undertaking on (day/month/year) / koji je počeo sa radom u preduzeću (dan, mesec, godina): ${formatSerbianDate(input.startedWorkAt)} / Ugovor od ${formatSerbianDate(input.contractSignedAt)}`,
    TEXT_X,
    BODY,
    font,
  );
  line();

  text('Au cours de la periode / za period', TEXT_X, y, BODY, bold);
  line();

  field(
    '12.',
    'from (hour/day/month/year) / od (čas/dan/mesec/godina):',
    formatAetrDateTime(input.periodFrom),
  );
  field(
    '13.',
    'to (hour/day/month/year) / do (čas/dan/mesec/godina):',
    formatAetrDateTime(input.periodTo),
  );

  REASONS.forEach((item, index) => {
    const n = String(14 + index);
    text(`${n}.`, NUM_X, y, BODY, font);
    text(BOX, TEXT_X, y, VALUE, font);
    let x = TEXT_X + font.widthOfTextAtSize(`${BOX} `, VALUE);
    if (item.reason === input.reason) {
      text('X', x, y, VALUE, bold);
      x += bold.widthOfTextAtSize('X  ', VALUE);
    }
    const suffix = item.reason === 'OTHER' && input.otherReason ? ` (${input.otherReason})` : '';
    const lines = wrapLines(item.text + suffix, font, BODY, RIGHT - PAD - x);
    lines.forEach((entry, lineIndex) => {
      if (lineIndex > 0) {
        line();
      }
      text(entry, lineIndex === 0 ? x : TEXT_X + 12, y, BODY, font);
    });
    line();
  });

  text('20.', NUM_X, y, BODY, font);
  text('Place / Mesto', TEXT_X, y, BODY, font);
  text(input.place, TEXT_X + 72, y, VALUE, font);
  text('Date / Datum:', LEFT + 318, y, BODY, font);
  text(formatSerbianDate(input.issuedAt), LEFT + 386, y, BODY, font);
  line();
  text('Signature / Potpis:', TEXT_X, y, BODY, font);

  page.drawImage(stamp, { x: 392, y: BOX_BOTTOM - 10, width: 132, height: 118 });

  const confirm =
    '21.  I, the driver, confirm that i have not been driving a vehicle falling under the scope of Regulation (EC) 561/2006 or AETR during the period mentioned above / Ja, vozač, potvrđujem da nisam upravljao vozilom iz oblasti AETR-a tokom gore pomenutog vremena.';
  wrapLines(confirm, font, BODY, RIGHT - LEFT).forEach((entry, index) => {
    text(entry, LEFT, 158 - index * 12, BODY, font);
  });

  text('22.', LEFT, 122, BODY, font);
  text('Place / Mesto:', TEXT_X, 122, BODY, font);
  text(input.place, TEXT_X + 78, 122, VALUE, font);
  text('Date / Datum:', LEFT + 318, 122, BODY, font);
  text(formatSerbianDate(input.issuedAt), LEFT + 386, 122, BODY, font);

  text('Signature of the driver / Potpis vozača:', TEXT_X, 102, BODY, font);
  const signatureStart =
    TEXT_X + font.widthOfTextAtSize('Signature of the driver / Potpis vozača: ', BODY);
  page.drawLine({
    start: { x: signatureStart, y: 101 },
    end: { x: RIGHT, y: 101 },
    thickness: 0.6,
    color: BLACK,
  });

  text('*', LEFT, 78, 7, font);
  text('Choose only one box / Izabrati jednu od ponuđenih opcija', LEFT + 10, 76, 8, font);

  return toBuffer(pdf);
};
