import { describe, expect, it } from 'vitest';

import { fileNameFromDisposition } from './download';

describe('fileNameFromDisposition', () => {
  it('prefers the UTF-8 name', () => {
    expect(
      fileNameFromDisposition(
        `attachment; filename="firma-_umadija.zip"; filename*=UTF-8''firma-%C5%A0umadija.zip`,
        'firma.zip',
      ),
    ).toBe('firma-Šumadija.zip');
  });

  it('falls back to the ASCII name, then to the default', () => {
    expect(fileNameFromDisposition('attachment; filename="firma-a.zip"', 'firma.zip')).toBe(
      'firma-a.zip',
    );
    expect(fileNameFromDisposition(undefined, 'firma.zip')).toBe('firma.zip');
  });
});
