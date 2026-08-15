/**
 * Employer identity used on generated employment contracts, MA forms and AETR
 * attestations. This is company data, not a driver's personal record.
 */
export const COMPANY = {
  legalName: 'RENTAL TRAVEL DOO',
  streetAddress: 'Mornarska 57/1/5',
  streetAddressShort: 'Mornarska 57',
  postalCode: '21000',
  city: 'Novi Sad',
  country: 'Republika Srbija',
  countryEn: 'Republic of Serbia',
  pib: '114113688',
  registrationNumber: '21973181',
  phoneIntl: '00381 69 20 84 860',
  email: 'rentaltraveldoo@gmail.com',
  directorName: 'Stefan Duraković',
  directorTitle: 'direktor',
  activity: 'Prevoz putnika',
} as const;

export const DEFAULT_DRIVER_DUTIES =
  'što podrazumeva prevoz putnika i robe sa jednog odredišta na drugo, većinom vozilom koje je u vlasništvu firme. Odgovornost vozača je da pripremi vozila, praćenje potrebe servisiranja, utovar/istovar robe, kontrola robe i putnika, izveštavanje o prevozu, prevoz ljudi, naplata vožnje.';
