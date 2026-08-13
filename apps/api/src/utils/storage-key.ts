import { randomUUID } from 'node:crypto';

const MAX_SANITIZED_LENGTH = 100;
const MAX_EXTENSION_LENGTH = 12;
const FALLBACK_FILE_NAME = 'file';

const truncatePreservingExtension = (fileName: string, maxLength: number): string => {
  if (fileName.length <= maxLength) {
    return fileName;
  }

  const lastDot = fileName.lastIndexOf('.');
  const hasUsableExtension = lastDot > 0 && fileName.length - lastDot <= MAX_EXTENSION_LENGTH;
  const extension = hasUsableExtension ? fileName.slice(lastDot) : '';
  const base = hasUsableExtension ? fileName.slice(0, lastDot) : fileName;

  return `${base.slice(0, Math.max(1, maxLength - extension.length)).replace(/[-._]+$/, '')}${extension}`;
};

/**
 * Letters that Unicode normalization cannot decompose into a base letter plus a
 * combining mark, because the stroke or ligature is part of the code point
 * itself. Without this map "Đorđević" would collapse to "orevi".
 */
const TRANSLITERATIONS: Record<string, string> = {
  đ: 'd',
  Đ: 'd',
  ð: 'd',
  ł: 'l',
  Ł: 'l',
  ø: 'o',
  Ø: 'o',
  ß: 'ss',
  æ: 'ae',
  Æ: 'ae',
  œ: 'oe',
  Œ: 'oe',
  þ: 'th',
  Þ: 'th',
};

const transliterate = (value: string): string =>
  value.replace(/[đĐðłŁøØßæÆœŒþÞ]/g, (char) => TRANSLITERATIONS[char] ?? char);

/**
 * Produces a file name that is safe to use inside an S3 key: no path segments,
 * no diacritics, no characters that need escaping. The original name is stored
 * in the database, so nothing is lost by normalizing aggressively here.
 */
export const sanitizeFileName = (fileName: string): string => {
  const withoutPath = fileName.split(/[\\/]/).pop() ?? '';

  const sanitized = transliterate(withoutPath)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/\.{2,}/g, '.')
    // Collapse separators that ended up next to the extension dot.
    .replace(/[-_]+\./g, '.')
    .replace(/\.[-_]+/g, '.')
    .replace(/^[-._]+/, '')
    .replace(/[-._]+$/, '');

  if (sanitized.length === 0) {
    return FALLBACK_FILE_NAME;
  }

  return truncatePreservingExtension(sanitized, MAX_SANITIZED_LENGTH);
};

/**
 * Builds the object key: `uploads/{year}/{month}/{uuid}-{sanitized-file-name}`.
 * The UUID guarantees uniqueness, so two uploads with the same name never
 * collide and a client can never choose where an object lands.
 */
export const buildStorageKey = (
  originalName: string,
  options: { now?: Date; uuid?: string } = {},
): string => {
  const now = options.now ?? new Date();
  const uuid = options.uuid ?? randomUUID();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');

  return `uploads/${year}/${month}/${uuid}-${sanitizeFileName(originalName)}`;
};

/**
 * Content-Disposition value that makes S3 return the file as a download using
 * the original name, with an ASCII fallback for legacy clients (RFC 5987).
 */
export const buildContentDisposition = (fileName: string): string => {
  const asciiFallback = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\;]/g, '_');

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
};
