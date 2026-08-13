import { describe, expect, it } from 'vitest';

import {
  ALLOWED_MIME_TYPES,
  FILE_INPUT_ACCEPT,
  MIME_TYPE_LABELS,
  isAllowedMimeType,
  megabytesToBytes,
} from './constants';

describe('megabytesToBytes', () => {
  it('converts using binary megabytes', () => {
    expect(megabytesToBytes(1)).toBe(1_048_576);
    expect(megabytesToBytes(25)).toBe(26_214_400);
  });
});

describe('isAllowedMimeType', () => {
  it('accepts every allow-listed type', () => {
    for (const mimeType of ALLOWED_MIME_TYPES) {
      expect(isAllowedMimeType(mimeType)).toBe(true);
    }
  });

  it.each([
    'image/svg+xml',
    'application/x-msdownload',
    'application/octet-stream',
    'text/html',
    '',
  ])('rejects %s', (mimeType) => {
    expect(isAllowedMimeType(mimeType)).toBe(false);
  });

  it('does not match on a prefix', () => {
    expect(isAllowedMimeType('application/pdf; charset=utf-8')).toBe(false);
  });
});

describe('MIME metadata', () => {
  it('labels every allowed type', () => {
    for (const mimeType of ALLOWED_MIME_TYPES) {
      expect(MIME_TYPE_LABELS[mimeType]).toBeTruthy();
    }
  });

  it('offers every allowed type to the file input', () => {
    const accepted = FILE_INPUT_ACCEPT.split(',');

    for (const mimeType of ALLOWED_MIME_TYPES) {
      expect(accepted).toContain(mimeType);
    }
  });
});
