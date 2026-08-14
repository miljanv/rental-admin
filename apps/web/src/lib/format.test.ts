import { describe, expect, it } from 'vitest';

import {
  formatDate,
  formatDateTime,
  formatFileSize,
  formatMimeType,
  getFileExtension,
} from './format';

describe('formatFileSize', () => {
  it('formats bytes below one kilobyte', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1)).toBe('1 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('switches to larger units at 1024', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(25 * 1024 * 1024)).toBe('25 MB');
    expect(formatFileSize(1024 ** 3)).toBe('1 GB');
  });

  it('keeps one decimal for fractional values', () => {
    expect(formatFileSize(2_621_440)).toBe('2.5 MB');
    expect(formatFileSize(1_600_000)).toBe('1.5 MB');
  });

  it('treats invalid input as zero', () => {
    expect(formatFileSize(-1)).toBe('0 B');
    expect(formatFileSize(Number.NaN)).toBe('0 B');
    expect(formatFileSize(Number.POSITIVE_INFINITY)).toBe('0 B');
  });
});

describe('formatDate', () => {
  it('formats an ISO date as a Serbian numeric date', () => {
    expect(formatDate('1990-01-01')).toBe('01.01.1990.');
    expect(formatDate('2026-08-14T10:00:00.000Z')).toBe('14.08.2026.');
  });

  it('renders a dash for a missing or invalid date', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
  });
});

describe('formatDateTime', () => {
  it('formats an ISO timestamp', () => {
    expect(formatDateTime('2026-08-13T15:04:00.000Z')).toMatch(/13 Aug 2026/);
  });

  it('renders a dash for a missing or invalid date', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime('not-a-date')).toBe('—');
  });
});

describe('formatMimeType', () => {
  it('uses the shared label for known types', () => {
    expect(formatMimeType('application/pdf')).toBe('PDF document');
    expect(formatMimeType('image/png')).toBe('PNG image');
    expect(
      formatMimeType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    ).toBe('Excel spreadsheet');
  });

  it('falls back to the subtype for unknown types', () => {
    expect(formatMimeType('audio/ogg')).toBe('OGG');
  });
});

describe('getFileExtension', () => {
  it('returns the upper case extension', () => {
    expect(getFileExtension('report.pdf')).toBe('PDF');
    expect(getFileExtension('archive.tar.gz')).toBe('GZ');
  });

  it('returns an empty string when there is no extension', () => {
    expect(getFileExtension('README')).toBe('');
    expect(getFileExtension('.env')).toBe('');
  });
});
