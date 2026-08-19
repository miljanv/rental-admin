/** A Serbian lična karta (ID card) number is always exactly 9 digits. */
export const ID_CARD_NUMBER_LENGTH = 9;

/**
 * The standard Serbian "stručna sprema" (education qualification) levels —
 * `educationLevel` stays free text on the record (so an already-saved value
 * that predates this list, or one typed by hand, is never rejected), but the
 * form offers this exact set as a pick-list so new entries stay consistent.
 */
export const EDUCATION_LEVELS = [
  'I Stepen - četiri razreda osnovne',
  'II Stepen - Osnovna škola',
  'III Stepen - SSS srednja škola',
  'IV Stepen - SSS srednja škola',
  'V Stepen - VKV - SSS srednja škola',
  'VI Stepen - VŠS viša škola',
  'VII-1 VSS visoka stručna sprema',
  'VI-1 Osnovne trogodišnje akademske studije',
  'VI-1 Osnovne trogodišnje strukovne studije',
  'VI-2 Specijalističke strukovne studije',
  'VII-1a Osnovne četvorogodišnje akademske studije',
  'VII-1a Integrisane master studije',
  'VII-1b Master',
  'VII-2 Magistar nauka',
  'VII-2 Specijalizacija u medicini',
  'VII-2 Specijalističke akademske studije',
  'VIII Doktor nauka',
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

/**
 * Every driving license category defined by the Serbian road traffic safety
 * law (Zakon o bezbednosti saobraćaja na putevima, čl. 195). A driver can
 * hold several at once, so `drivingLicenseCategory` keeps storing them as one
 * comma-separated string (unchanged on the backend) — the multi-select form
 * control just builds/parses that string from these codes.
 */
export const DRIVING_LICENSE_CATEGORIES = [
  'AM',
  'A1',
  'A2',
  'A',
  'B1',
  'B',
  'BE',
  'C1',
  'C1E',
  'C',
  'CE',
  'D1',
  'D1E',
  'D',
  'DE',
  'F',
  'M',
] as const;

export type DrivingLicenseCategory = (typeof DRIVING_LICENSE_CATEGORIES)[number];

export const DRIVING_LICENSE_CATEGORY_LABELS: Record<DrivingLicenseCategory, string> = {
  AM: 'Mopedi, laki tricikli i četvorocikli',
  A1: 'Motocikli do 125 cm³ i 11 kW',
  A2: 'Motocikli do 35 kW',
  A: 'Motocikli i teški tricikli preko 15 kW',
  B1: 'Teški četvorocikli',
  B: 'Vozila do 3.500 kg, najviše 8 sedišta',
  BE: 'Vozilo kat. B sa prikolicom 750–3.500 kg',
  C1: 'Vozila 3.500–7.500 kg',
  C1E: 'Vozilo kat. C1 sa prikolicom preko 750 kg',
  C: 'Vozila preko 3.500 kg',
  CE: 'Vozilo kat. C sa prikolicom preko 750 kg',
  D1: 'Prevoz lica, 8 do 16 sedišta',
  D1E: 'Vozilo kat. D1 sa prikolicom preko 750 kg',
  D: 'Prevoz lica, preko 8 sedišta',
  DE: 'Vozilo kat. D sa prikolicom preko 750 kg',
  F: 'Traktori i radne mašine',
  M: 'Motokultivator',
};

/**
 * Official job titles for the employees form. One person can hold several at
 * once, so `jobTitle` stays one comma-separated string. Unrecognized
 * already-saved values are kept on the record, not rejected.
 */
export const JOB_TITLES = [
  'Vozač autobusa u zemlji i inostranstvu',
  'Vozač autobusa na prevozu radnika u zemlji',
  'Vozač putničkog vozila u zemlji i inostranstvu',
  'Dispečer',
  'Administrativni radnik',
  'Direktor',
] as const;

export type JobTitle = (typeof JOB_TITLES)[number];

/** Covers every known title selected at once, with room for custom values. */
export const JOB_TITLE_MAX_LENGTH = 400;

/** Case-insensitive match so older rows like "vozač autobusa…" still tick the pick-list. */
export const canonicalJobTitle = (value: string): JobTitle | undefined => {
  const trimmed = value.trim();

  return JOB_TITLES.find(
    (title) => title.localeCompare(trimmed, 'sr', { sensitivity: 'accent' }) === 0,
  );
};

export const DRIVER_STATUSES = ['ACTIVE', 'SICK_LEAVE', 'VACATION', 'INACTIVE'] as const;

export type DriverStatus = (typeof DRIVER_STATUSES)[number];

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  ACTIVE: 'Aktivan',
  SICK_LEAVE: 'Bolovanje',
  VACATION: 'Godišnji',
  INACTIVE: 'Neaktivan',
};

/**
 * ACTUAL: genuinely employed — contract paperwork rarely changes. NOMINAL:
 * employed on paper only for a given trip/engagement — new employment
 * documents get generated almost every time they go out.
 */
export const EMPLOYMENT_TYPES = ['ACTUAL', 'NOMINAL'] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  ACTUAL: 'Stvarno zaposlen',
  NOMINAL: 'Fiktivno zaposlen',
};

export interface DriverDto {
  id: string;
  firstName: string;
  lastName: string;
  jmbg: string;
  dateOfBirth: string;
  residencePlace: string;
  /** Street and house number. Optional — used to auto-fill the generated-document forms. */
  residenceAddress: string | null;
  educationLevel: string;
  idCardNumber: string;
  drivingLicenseNumber: string;
  drivingLicenseCategory: string;
  licenseNumber: string;
  phone: string;
  email: string | null;
  jobTitle: string;
  status: DriverStatus;
  employmentType: EmploymentType;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteDriverResult {
  id: string;
  deleted: true;
}
