import { COMPANY, DEFAULT_DRIVER_DUTIES, type GenerateEmploymentContractRequest } from '@rental-admin/shared';
import { rgb, type PDFFont, type PDFPage } from 'pdf-lib';

import type { DriverRecord } from '../../utils/driver-mapper';
import { driverFullName, formatSerbianDate, formatSerbianMoney } from './format';
import {
  createPdf,
  drawUnderline,
  embedCompanyStamp,
  fromTop,
  strikeAt,
  toBuffer,
  wrapLines,
} from './overlay';

interface EmploymentContractPdfInput {
  driver: DriverRecord;
  input: GenerateEmploymentContractRequest;
}

const LEFT = 56.8;
const WIDTH = 480;
const SIZE = 10;
const LINE = 11.6;

const draw = (
  page: PDFPage,
  text: string,
  y1: number,
  font: PDFFont,
  options: { x?: number; size?: number } = {},
): void => {
  page.drawText(text, {
    x: options.x ?? LEFT,
    y: fromTop(y1, page.getHeight()),
    size: options.size ?? SIZE,
    font,
    color: rgb(0, 0, 0),
  });
};

const caption = (page: PDFPage, text: string, x: number, y1: number, font: PDFFont): void => {
  draw(page, text, y1, font, { x, size: 9 });
};

export const buildEmploymentContractPdf = async (
  params: EmploymentContractPdfInput,
): Promise<Buffer> => {
  const { driver, input } = params;
  const { pdf, fonts } = await createPdf();
  const page1 = pdf.addPage([595.3, 841.89]);
  const page2 = pdf.addPage([595.3, 841.89]);
  const stamp = await embedCompanyStamp(pdf);
  const name = driverFullName(driver);
  const isFixedTerm = input.employmentContractType === 'FIXED_TERM';
  const title = isFixedTerm
    ? 'UGOVOR O RADU NA ODREĐENO VREME'
    : 'UGOVOR O RADU NA NEODREĐENO VREME';
  const duties = `${driver.jobTitle} ${input.jobDescription ?? DEFAULT_DRIVER_DUTIES}`.trim();
  const salary = `=${formatSerbianMoney(input.netSalary)}`;
  const body = fonts.serif;
  const bold = fonts.serifBold;

  draw(
    page1,
    'Na osnovu člana 30. stav 2. i člana 30, 31, 32 i 33. Zakona o radu („Službeni glasnik RS“, br.24/05, 61/05, 54/09, 32/13,',
    68.2,
    body,
  );
  draw(page1, '75/14, 13/17 i 113/17 i 95/2018), zaključuje se', 79.8, body);

  const titleWidth = fonts.serifBoldItalic.widthOfTextAtSize(title, 14);
  draw(page1, title, 119, fonts.serifBoldItalic, {
    x: (page1.getWidth() - titleWidth) / 2,
    size: 14,
  });

  const employer = `„${COMPANY.legalName} “  ${COMPANY.streetAddress}, PIB: ${COMPANY.pib}`;
  draw(page1, employer, 146.6, bold);
  drawUnderline(page1, 65, 294, 146.05);
  drawUnderline(page1, 338, 530.5, 146.05);
  caption(page1, '(naziv i sedište poslodavca)', 234.1, 157.9, body);

  const employee = `zasniva radni odnos sa ${name}  , ${driver.educationLevel}  ,  JMBG ${driver.jmbg}`;
  draw(page1, employee, 169.7, body);
  drawUnderline(page1, 149.5, 351.75, 169.15);
  caption(page1, '(ime i prezime zaposlenog,jmbg, vrsta i stepen stručne spreme)', 234.1, 181.3, body);

  const address = `sa prebivalištem (boravištem) u opština ${input.municipality}, ${driver.residencePlace}, ulica ${input.residenceStreet}.`;
  draw(page1, address, 192.8, body);
  caption(page1, '(mesto, ulica i broj)', 163.1, 204.4, body);

  const jobLines = wrapLines(body, `na poslovima ${duties}`, SIZE, WIDTH);
  jobLines.forEach((line, index) => {
    draw(page1, line, 215.9 + index * LINE, body);
  });

  draw(page1, `2. Zaposleni će obavljati poslove u ${input.workplace}`, 264.4, body);
  drawUnderline(page1, 198.7, 446.7, 263.8);
  caption(page1, '(mesto rada)', 340.4, 275.9, body);

  draw(page1, '3. Zaposleni zasniva radni odnos na:', 287.4, body);
  const indefinite = `1) neodredjeno vreme${isFixedTerm ? '' : `  ${formatSerbianDate(input.startsAt)}`}`;
  const fixed = isFixedTerm
    ? `2) odredjeno vreme  od ${formatSerbianDate(input.startsAt)} do ${formatSerbianDate(input.expiresAt ?? '')}`
    : '2) odredjeno vreme';
  draw(page1, indefinite, 301.2, body, { size: 12 });
  draw(page1, fixed, 315, body, { size: 12 });
  const unused = isFixedTerm ? indefinite : fixed;
  strikeAt(page1, LEFT, isFixedTerm ? 301.2 : 315, body.widthOfTextAtSize(unused, 12) + 6, 12);

  draw(
    page1,
    `4. Zaposleni je dužan da stupi na rad (dan, mesec i godina) ${formatSerbianDate(input.startsAt)}godine.`,
    326.6,
    body,
  );
  drawUnderline(page1, 294.5, 460, 326);

  drawParagraph(
    page1,
    `5. Probni rad traje (${input.trialPeriodDays} radnih dana). Zaposlenom koji za vreme probnog rada nije pokazao odgovarajuće radne i stručne sposobnosti prestaje radni odnos radnom isteka probnog rada. Zaposleni koji za vreme probnog rada ispolji odgovarajuće radne i stručne sposobnosti, ostaje u radnom osnosu.`,
    338.1,
    body,
  );

  drawParagraph(
    page1,
    `6. Zaposleni zasniva radni odnos sa punim radnim vremenom, u trajanju od   ${input.weeklyHours}     časova nedeljno, dnevno 8h a kada priroda posla i organizacija rada to zahteva poslodavac može radnu nedelju i raspored radnog vremena da organizuje i na drugi način.`,
    372.8,
    body,
  );
  drawUnderline(page1, 201.4, 231.6, 372.2);
  drawUnderline(page1, 368.3, 390.8, 372.2);

  draw(
    page1,
    `7.Osnovna zarada zaposlenog na dan zaključenja ovog ugovora, iznosi ${salary}  (neto iznos) koji je brutiran na`,
    407.4,
    body,
  );
  drawUnderline(page1, 342, 396, 406.85);
  draw(
    page1,
    'dan isplate (tj.pod zaradom se smatra zarada koja sadrži poreze i doprinose koje se plaćaju iz zarade).',
    419,
    bold,
  );

  drawStaticArticlesPage1(page1, body, input);

  drawStaticArticlesPage2(page2, body, formatSerbianDate(input.signedAt));
  page2.drawImage(stamp, { x: 321, y: 122, width: 190, height: 170 });

  return toBuffer(pdf);
};

const drawParagraph = (page: PDFPage, text: string, firstY1: number, font: PDFFont): void => {
  wrapLines(font, text, SIZE, WIDTH).forEach((line, index) => {
    draw(page, line, firstY1 + index * LINE, font);
  });
};

const drawStaticArticlesPage1 = (
  page: PDFPage,
  font: PDFFont,
  input: GenerateEmploymentContractRequest,
): void => {
  const lines: Array<[string, number]> = [
    ['8. Deo zarade za radni učinak zavisi od rezultata rada zaposlenog, i može da se uveća do ________', 430.5],
    ['ili umanji do _________ od osnovne zarade zaposlenog na efektivnim časovima rada.', 442.1],
    ['9. Zarada se isplaćuje do poslednjeg datuma u mesecu za prethodni mesec a najmanje jedanput mesečno.', 453.6],
    ['(rokovi isplate)', 465.2],
    ['Poslodavac je dužan da prilikom svake isplate zarade i naknade zarade zaposlenom dostavi obračun.', 476.7],
    ['10. Zaposleni ima pravo na uvećanu zaradu:', 488.3],
    ['1) za rad na dan praznika koji je neradan dan 110% od osnovice,', 499.8],
    ['2) za prekovremeni rad 26% od osnovice,', 511.4],
    ['3) za noćni rad ____% od osnovice,', 522.9],
    ['4) za svaku punu godinu rada u radnom odnosu kod poslodavca 0,4% od osnovice.', 534.5],
    ['5)________________________________________________________________________', 546],
    ['Osnovice za obračun uvećane zarade jeste osnovna zarada.', 557.6],
    [
      '11. Zaposleni ima pravo na naknadu zarade u visini prosečne zarade u prethodnih 12 meseci za vreme odsustvovanja sa',
      569.1,
    ],
    [
      'rada na dan praznika koji je neradni dan, godišnjeg odmora, plaćenog odsustva, prestanka sa radom pre otkaznog roka',
      580.7,
    ],
    ['prema Zakonu o radu, vojne vežbe i odazivanja na poziv državnog organa.', 592.2],
    [
      '12. Zaposleni ima pravo na naknadu zarade za vreme odsustvovanja sa rada zbog privremene sprečenosti za rad do 30',
      603.8,
    ],
    ['dana i to:', 615.3],
    [
      '1) u visini 65%  prosečne zarade u prethodnih 12 meseci pre meseca u kojem je nastupila privremena sprečenost za rad,',
      626.9,
    ],
    ['prouzrokovana bolešću ili povredom van rada', 638.4],
    [
      '2) u visini 100%  prosečne zarade u prethodnih 12 meseci pre meseca u kojem je nastupila privremena sprečenost za',
      650,
    ],
    ['rad prouzrokovana povredom na radu ili profesionalnom bolešću.', 661.5],
    [
      '13. Zaposleni ima pravo na naknadu zarade u visini _____ % prosečne zarade u prethodnih 12 meseci, za vreme prekida',
      673.1,
    ],
    [
      'rada ili smanjenja obima rada do kojeg je došlo bez krivice zaposlenog, najduže 45 radnih dana u kalendarskoj godini.',
      684.6,
    ],
    ['14. Zaposleni ima pravo na naknadu troškova:', 696.2],
    ['1) za vreme provedeno na službenom putu u inostranstvu u visini ____________________________________', 707.7],
    [
      `2) prevoza za dolazak i odlazak sa posla u visini gradske mesečne karte javnog prevoza =${formatSerbianMoney(input.transportAllowance)} dinara.`,
      719.3,
    ],
    [`3) za ishranu u toku rada =${formatSerbianMoney(input.mealAllowance)} dinara (bruto iznos)`, 730.8],
    [
      `4) za regres za korišćenje godišnjeg odmora =${formatSerbianMoney(input.holidayAllowance)} dinara (bruto iznos).`,
      742.4,
    ],
    ['15. Zaposleni ima pravo na druga primanja, i to na:', 753.9],
    ['1) otpremninu pri odlasku u penziju u visini ______________________________________', 765.5],
    [
      '2) naknadu troškova pogrebnih usluga u slučaju smrti člana uže porodice, a članovima uže porodice u slučaju smrti',
      777,
    ],
  ];

  for (const [text, y1] of lines) {
    const x = text === '(rokovi isplate)' ? 269.5 : LEFT;
    draw(page, text, y1, font, { x });
  }
};

const drawStaticArticlesPage2 = (
  page: PDFPage,
  font: PDFFont,
  signedAt: string,
): void => {
  const lines: Array<[string, number, number?]> = [
    ['zaposlenog, u visini ____________________________________________________', 68.2],
    ['3) _______________________________________________________________________', 79.8],
    ['4) _______________________________________________________________________', 91.3],
    ['5) _______________________________________________________________________', 102.9],
    ['6) _______________________________________________________________________', 114.4],
    ['16. Zaposleni ima pravo na:', 126],
    ['1) odmor u toku dnevnog rada u trajanju od 30 minuta', 137.5],
    ['2) dnevni odmor u trajanju od 12 časova', 149.1],
    ['3) nedeljni odmor u trajanju od 24 časova.', 160.6],
    [
      '17 Zaposleni ima pravo na godišnji odmor u trajanju od 20 radnih dana, polazeći od kriterijuma uslova rada, radnog',
      172.2,
    ],
    [
      'iskustva i stručne spreme zaposlenog. Trajanje godišnjeg odmora zaposlenog određuje se posebnim rešenjem za svaku',
      183.7,
    ],
    [
      'kalendarsku godinu, tako da se broj dana godišnjeg odmora iz ovog člana može uvećati po sledećim kriterijumima:',
      195.3,
    ],
    ['doprinos na radu – do ______ dana, maloletna deca zaposlenog _____ dana po detetu, drugi kriterijumi', 206.8],
    ['______________________________________________________________________.', 218.4],
    ['18. Zaposleni ima pravo na plaćeno odsustvo:', 229.9],
    ['1) udaja – ženidba                                                               u trajanju od     5    radnih dana', 241.5],
    ['(slučaj)', 251.8],
    ['2) smrt (teža bolest) užeg člana porodice                          u trajanju od    5     radnih dana', 263.4],
    ['(slučaj)', 273.7],
    ['3) selidba u mestu                                                                u trajanju od    1   radnih dana', 285.3],
    ['(slučaj)', 295.6],
    ['4) selidba van mesta                                                           u trajanju od     2    radnih dana', 307.2],
    ['(slučaj)', 318.7],
    ['5) davanje krvi                                                                     u trajanju od    2    radnih dana', 330.3],
    ['(slučaj)', 341.8],
    [
      '19. Za vreme radnog vremena radnik je obavešten da je konzumacija alkoholnih pića strogo zabranjena i u slučaju da',
      353.4,
    ],
    [
      'poslodavac zatekne radnika da konzumira alkohol radnik je saglasan da može da dobije momentalni otkaz.',
      364.9,
    ],
    [
      '20. Zaposleni je odgovoran za štetu koju je na radu ili u vezi sa radom, namerno ili iz krajnje nepažnje prouzrokovao',
      376.5,
    ],
    ['poslodavcu.', 388],
    [
      '21. Poslodavac je dužan da odmah, a najkasnije pre stupanja zaposlenog na rad, podnese propisane prijave na obavezno',
      399.6,
    ],
    ['socijalno osiguranje i da blagovremeno uplaćuje doprinose, u skladu sa zakonom.', 411.1],
    [
      '22.  Poslodavac je dužan da obezbedi zaštitu života i zdravlja zaposlenog za vreme rada, u skladu sa zakonom i drugim',
      422.7,
    ],
    ['propisima.', 434.2],
    [
      '23. Poslodavac je dužan da zaposlenom, u slučaju povrede ili štete na radu ili u vezi sa radom, nadoknadi štetu, u skladu',
      445.8,
    ],
    ['sa zakonom i ____________________________________________________________________________________.', 457.3],
    ['(opšti akt)', 468.9],
    [
      '24. Zaposleni i poslodavac prihvataju sva prava, obaveze i odgovornosti utvrđene zakonom, _____________________',
      480.4,
    ],
    ['_________________________________________________________________ i ovim ugovorom.', 492],
    ['(opšti akt)', 503.5],
    ['25. Ovim ugovorom utvrđuju se i prava i obaveze, i to: ___________________________________________________', 515.1],
    [
      '26. Ovaj ugovor mogu otkazati zaposleni i posldavac, u slučajevima i na način propisan Zakonom o radu. Otkazom',
      538.2,
    ],
    ['ugovora, koji je saglasan zakonu, prestaje radni odnos zaposlenog.', 549.7],
    [
      '27. Ovaj ugovor sačinjen je u __3__ istovetnih primeraka od kojih po __1__ primerak zadržavaju svaka od ugovornih',
      561.3,
    ],
    ['strana.', 572.8],
    ['U Novom Sadu', 595.9],
    [`Dana ${signedAt} godine`, 607.5],
    ['Zaposleni', 642.1],
    ['Za poslodavca', 642.1],
    ['____________________________ __', 653.7],
    ['________________________________', 653.7],
    ['(M.P.)', 666.3],
  ];

  for (const [text, y1] of lines) {
    let x = LEFT;
    if (text === 'Za poslodavca') {
      x = 375.9;
    } else if (text === '________________________________') {
      x = 340.4;
    } else if (text === '(M.P.)') {
      x = 234.1;
    } else if (text === '(opšti akt)' && y1 === 468.9) {
      x = 305;
    } else if (text === '(slučaj)' && y1 === 318.7) {
      x = 198.6;
    }
    const size = text === '(slučaj)' ? 9 : SIZE;
    draw(page, text, y1, font, { x, size });
  }

  drawUnderline(page, LEFT, 157.5, 607.5);
};
