import { describe, expect, it } from 'vitest';

import { buildContentDisposition, buildStorageKey, sanitizeFileName } from './storage-key';

describe('sanitizeFileName', () => {
  it('keeps a simple name unchanged apart from lowercasing', () => {
    expect(sanitizeFileName('report.pdf')).toBe('report.pdf');
    expect(sanitizeFileName('Report.PDF')).toBe('report.pdf');
  });

  it('replaces whitespace and unsafe characters with a single dash', () => {
    expect(sanitizeFileName('my invoice (final).pdf')).toBe('my-invoice-final.pdf');
    expect(sanitizeFileName('a***b???c.txt')).toBe('a-b-c.txt');
  });

  it('strips diacritics instead of dropping the characters', () => {
    expect(sanitizeFileName('Ugovor-Đorđević-šćžć.docx')).toBe('ugovor-dordevic-sczc.docx');
  });

  it('removes path traversal segments', () => {
    expect(sanitizeFileName('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFileName('..\\..\\windows\\system32\\config.sys')).toBe('config.sys');
    expect(sanitizeFileName('/absolute/path/file.txt')).toBe('file.txt');
  });

  it('does not produce hidden files or leading separators', () => {
    expect(sanitizeFileName('.env')).toBe('env');
    expect(sanitizeFileName('---weird---.txt')).toBe('weird.txt');
  });

  it('falls back to a placeholder when nothing usable is left', () => {
    expect(sanitizeFileName('***')).toBe('file');
    expect(sanitizeFileName('')).toBe('file');
  });

  it('truncates very long names but keeps the extension', () => {
    const result = sanitizeFileName(`${'a'.repeat(300)}.pdf`);

    expect(result.length).toBeLessThanOrEqual(100);
    expect(result.endsWith('.pdf')).toBe(true);
  });
});

describe('buildStorageKey', () => {
  it('uses the uploads/{year}/{month}/{uuid}-{name} layout', () => {
    const key = buildStorageKey('Quarterly Report.pdf', {
      now: new Date('2026-03-09T10:00:00.000Z'),
      uuid: '11111111-2222-3333-4444-555555555555',
    });

    expect(key).toBe('uploads/2026/03/11111111-2222-3333-4444-555555555555-quarterly-report.pdf');
  });

  it('never reuses the original name as the unique part of the key', () => {
    const first = buildStorageKey('same-name.txt');
    const second = buildStorageKey('same-name.txt');

    expect(first).not.toBe(second);
  });
});

describe('buildContentDisposition', () => {
  it('forces a download and encodes non-ASCII names', () => {
    expect(buildContentDisposition('Ugovor Đorđević.pdf')).toBe(
      'attachment; filename="Ugovor _or_evi_.pdf"; filename*=UTF-8\'\'Ugovor%20%C4%90or%C4%91evi%C4%87.pdf',
    );
  });

  it('neutralizes quotes that could break the header', () => {
    expect(buildContentDisposition('we"ird.txt')).toContain('filename="we_ird.txt"');
  });
});
