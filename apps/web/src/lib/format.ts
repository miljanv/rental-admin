import { MIME_TYPE_LABELS, type AllowedMimeType } from '@rental-admin/shared';

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/**
 * Human readable file size using binary units (1 KB = 1024 B).
 * Whole numbers stay whole, everything else gets one decimal.
 */
export const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), SIZE_UNITS.length - 1);
  const value = bytes / 1024 ** unitIndex;
  const unit = SIZE_UNITS[unitIndex] ?? 'B';
  const rounded = Math.round(value * 10) / 10;

  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} ${unit}`;
};

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Calendar date in Serbian numeric form, for example "01.01.1990." */
export const formatDate = (isoDate: string | null): string => {
  if (!isoDate) {
    return '—';
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);

  if (!match) {
    return '—';
  }

  const [, year, month, day] = match;

  return `${day}.${month}.${year}.`;
};

/** Wall-clock datetime stored as UTC, for example "17.06.2026. 19:30". */
export const formatDateTimeSr = (isoDate: string | null): string => {
  if (!isoDate) {
    return '—';
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(isoDate);

  if (!match) {
    return '—';
  }

  const [, year, month, day, hour, minute] = match;

  return `${day}.${month}.${year}. ${hour}:${minute}`;
};

/** Absolute date and time, for example "13 Aug 2026, 15:04". */
export const formatDateTime = (isoDate: string | null): string => {
  if (!isoDate) {
    return '—';
  }

  const date = new Date(isoDate);

  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date);
};

/** Short label for a MIME type, falling back to the subtype in upper case. */
export const formatMimeType = (mimeType: string): string => {
  const label = MIME_TYPE_LABELS[mimeType as AllowedMimeType];

  if (label) {
    return label;
  }

  const subtype = mimeType.split('/').at(-1) ?? mimeType;

  return subtype.toUpperCase();
};

/** File extension derived from the name, without the dot. */
export const getFileExtension = (fileName: string): string => {
  const lastDot = fileName.lastIndexOf('.');

  return lastDot > 0 ? fileName.slice(lastDot + 1).toUpperCase() : '';
};
