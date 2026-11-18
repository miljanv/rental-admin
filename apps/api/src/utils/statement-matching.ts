const cyrillic: Record<string, string> = {
  А: 'A',
  Б: 'B',
  В: 'V',
  Г: 'G',
  Д: 'D',
  Ђ: 'DJ',
  Е: 'E',
  Ж: 'Z',
  З: 'Z',
  И: 'I',
  Ј: 'J',
  К: 'K',
  Л: 'L',
  Љ: 'LJ',
  М: 'M',
  Н: 'N',
  Њ: 'NJ',
  О: 'O',
  П: 'P',
  Р: 'R',
  С: 'S',
  Т: 'T',
  Ћ: 'C',
  У: 'U',
  Ф: 'F',
  Х: 'H',
  Ц: 'C',
  Ч: 'C',
  Џ: 'DZ',
  Ш: 'S',
};

const transliterate = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'dj')
    .toUpperCase()
    .replace(/[А-ЯЂЈЉЊЋЏ]/g, (letter) => cyrillic[letter] ?? letter);

/** Legal-form words a bank may add or drop: "RENTAL TRAVEL", "… DOO", "… D.O.O.". */
const LEGAL_FORMS = new Set(['DOO', 'AD', 'PR', 'SZR', 'STR', 'SUR', 'OD', 'KD', 'DOOEL']);

export const normalizeStatementName = (value: string): string => {
  const words = transliterate(value)
    .replace(/\bD\s*\.\s*O\s*\.\s*O\b\.?/g, ' DOO ')
    .replace(/\bA\s*\.\s*D\b\.?/g, ' AD ')
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
  const withoutLegalForm = words.filter((word) => !LEGAL_FORMS.has(word));
  return (withoutLegalForm.length > 0 ? withoutLegalForm : words).join('');
};

export const canonicalBankAccount = (value: string | null | undefined): string => {
  const text = value?.replace(/\s/g, '') ?? '';
  const domestic = /^(\d{3})-(\d{1,13})-(\d{2})$/.exec(text);
  return domestic
    ? `${domestic[1]}${domestic[2]!.padStart(13, '0')}${domestic[3]}`
    : text.replace(/-/g, '').toUpperCase();
};

/** Never choose the first of several plausible counterparties. */
export const uniqueStatementNameMatch = <T>(
  records: T[],
  raw: string | null | undefined,
  names: (record: T) => string[],
): T | null => {
  const key = normalizeStatementName(raw ?? '');
  if (!key) return null;
  const exact = records.filter((record) =>
    names(record).some((name) => normalizeStatementName(name) === key),
  );
  if (exact.length) return exact.length === 1 ? exact[0]! : null;
  const matches = records.filter((record) =>
    names(record).some((name) => {
      const normalized = normalizeStatementName(name);
      return (
        (normalized.length >= 5 && key.includes(normalized)) ||
        (normalized.length >= 3 &&
          (raw ?? '').split(/\s+/).some((word) => normalizeStatementName(word) === normalized))
      );
    }),
  );
  return matches.length === 1 ? matches[0]! : null;
};
