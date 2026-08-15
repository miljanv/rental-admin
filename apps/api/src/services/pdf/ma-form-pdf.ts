import fs from 'node:fs';

import { COMPANY, type GenerateMaFormRequest } from '@rental-admin/shared';

import type { DriverRecord } from '../../utils/driver-mapper';
import { FONT_PATHS } from './fonts';
import { formatSlashDate, splitStreetAndNumber } from './format';
import { loadTemplate, toBuffer } from './overlay';

interface MaFormPdfInput {
  driver: DriverRecord;
  input: GenerateMaFormRequest;
}

const MA_INSURANCE_BASIS_101 =
  '101 - ЗАПОСЛЕНИ У ПРИВРЕДНОМ ДРУШТВУ, ДРУГОМ ПРАВНОМ ЛИЦУ, КОД ПРЕДУЗЕТНИКА, ЦИВИЛНА ЛИЦА НА СЛУЖБИ У ВОЈСЦИ';

const MA_COMPANY = {
  name: 'ПРИВРЕДНО ДРУШТВО ЗА САОБРАЋАЈ И УСЛУГЕ РЕНТАЛ ТРАВЕЛ ДОО НОВИ САД',
  municipality: 'НОВИ САД',
  city: 'НОВИ САД',
  street: 'МОРНАРСКА',
  number: '57',
  ptt: '21107',
  director: 'СТЕФАН ДУРАКОВИЋ',
} as const;

const toUpper = (value: string): string => value.trim().toLocaleUpperCase('sr-RS');

const maCitizenship = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes('srbij') || normalized.includes('serbia')) {
    return 'СРБИЈА';
  }

  return toUpper(value);
};

const maGender = (gender: GenerateMaFormRequest['gender']): string =>
  gender === 'FEMALE' ? 'женски' : 'мушки';

const maEmploymentKind = (kind: GenerateMaFormRequest['employmentKind']): string =>
  kind === 'FIXED_TERM' ? 'Одређено' : 'Неодређено';

const maInsuranceBasis = (value: string): string =>
  value.trim() === '101' ? MA_INSURANCE_BASIS_101 : value.trim();

export const buildMaFormPdf = async (params: MaFormPdfInput): Promise<Buffer> => {
  const { driver, input } = params;
  const pdf = await loadTemplate('maForm');
  const font = await pdf.embedFont(fs.readFileSync(FONT_PATHS.sansRegular), { subset: false });
  const form = pdf.getForm();
  const { street, number } = splitStreetAndNumber(input.residenceStreet);
  const start = formatSlashDate(input.insuranceStartDate);

  const set = (name: string, value: string): void => {
    const field = form.getTextField(name);
    field.setFontSize(8);
    field.setText(value);
    field.updateAppearances(font);
  };

  set('JMBG_LBO', driver.jmbg);
  set('IME', toUpper(driver.firstName));
  set('PREZIME', toUpper(driver.lastName));
  set('POL', maGender(input.gender));
  set('DATUM_RODJENJA', formatSlashDate(driver.dateOfBirth.toISOString()));
  set('IME_JEDNOG_RODITELJA', toUpper(input.parentName));
  set('OPSTINA_PREBIVALISTA', toUpper(input.municipality));
  set('MESTO_PREBIVALISTA', toUpper(driver.residencePlace));
  set('ULICA', toUpper(street));
  set('ULICA_BROJ', number);
  set('ULICA_STAN', input.apartment ?? '');
  set('DRZAVLJANSTVO', maCitizenship(input.citizenship));
  set('ZANIMANJE_SKOLOVANJE', toUpper(input.qualification));
  set('NOSILAC_OSIGURANJA', 'да');
  set('DATUM_POCETKA_OSIG', start);
  set('OSNOV_OSIGURANJA', maInsuranceBasis(input.insuranceBasis));
  set('ZANIMANJE_RADNO', toUpper(input.occupation));
  set('STEPEN_STRUCNE_SPREME_RADNO', input.qualification);
  set('RADNO_VREME', `${input.weeklyHours.toFixed(1)}`);
  set('VRSTA_ZAPOSLENJA', maEmploymentKind(input.employmentKind));
  set('ZAPOSLEN_KOD_VISE', 'не');
  set('OSNOV_PRESTANKA', '-');
  set('NAZIV_OBVEZNIKA', MA_COMPANY.name);
  set('OBVEZNIK_OPSTINA', MA_COMPANY.municipality);
  set('OBVEZNIK_MESTO', MA_COMPANY.city);
  set('OBVEZNIK_ULICA', MA_COMPANY.street);
  set('OBVEZNIK_BROJ', MA_COMPANY.number);
  set('PTT_ADRESA_OBVEZNIKA', MA_COMPANY.ptt);
  set('POS_JED_MESTO', toUpper(input.workplace));
  set('DELATNOST', input.activity);
  set('MB', input.companyRegistrationNumber);
  set('PIB', COMPANY.pib);
  set('EMAIL', COMPANY.email);
  set('DATUM_PODNOSENJA', start);
  set('DATUM_PRIJAVE', start);
  set('PRIJAVU_PRIMIO', MA_COMPANY.director);

  form.flatten();

  return toBuffer(pdf);
};
