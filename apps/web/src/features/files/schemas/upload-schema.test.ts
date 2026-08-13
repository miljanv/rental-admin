import { megabytesToBytes } from '@rental-admin/shared';
import { describe, expect, it } from 'vitest';

import { uploadFormSchema, validateSelectedFile } from './upload-schema';

const createFile = (options: { name: string; type: string; sizeInBytes: number }): File => {
  const file = new File(['x'], options.name, { type: options.type });

  // File size cannot be set through the constructor for large fixtures.
  Object.defineProperty(file, 'size', { value: options.sizeInBytes });

  return file;
};

describe('validateSelectedFile', () => {
  it('accepts an allowed file within the limit', () => {
    const file = createFile({
      name: 'contract.pdf',
      type: 'application/pdf',
      sizeInBytes: megabytesToBytes(2),
    });

    expect(validateSelectedFile(file)).toBeNull();
  });

  it('rejects a file above the 25 MB limit', () => {
    const file = createFile({
      name: 'huge.zip',
      type: 'application/zip',
      sizeInBytes: megabytesToBytes(26),
    });

    expect(validateSelectedFile(file)).toBe('File is larger than the 25 MB limit.');
  });

  it('rejects an empty file', () => {
    const file = createFile({ name: 'empty.txt', type: 'text/plain', sizeInBytes: 0 });

    expect(validateSelectedFile(file)).toBe('The selected file is empty.');
  });

  it('rejects a MIME type that is not allow-listed', () => {
    const file = createFile({
      name: 'script.svg',
      type: 'image/svg+xml',
      sizeInBytes: 2048,
    });

    expect(validateSelectedFile(file)).toBe('This file type is not supported.');
  });

  it('rejects a file the browser could not type', () => {
    const file = createFile({ name: 'mystery.bin', type: '', sizeInBytes: 2048 });

    expect(validateSelectedFile(file)).toBe('This file type is not supported.');
  });

  it('accepts every documented file family', () => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
    ];

    for (const type of allowedTypes) {
      const file = createFile({ name: 'file', type, sizeInBytes: 1024 });

      expect(validateSelectedFile(file), `${type} must be accepted`).toBeNull();
    }
  });
});

describe('uploadFormSchema', () => {
  it('requires a file to be selected', () => {
    expect(uploadFormSchema.safeParse({}).success).toBe(false);
    expect(uploadFormSchema.safeParse({ file: 'contract.pdf' }).success).toBe(false);
  });
});
