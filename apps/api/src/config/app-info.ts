import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FALLBACK_VERSION = '0.1.0';

/**
 * Reads the version from the package manifest next to the compiled output
 * (`dist/../package.json`), falling back to a constant when the file is not
 * shipped (for example in a bundled deployment).
 */
const readVersion = (): string => {
  try {
    const manifestPath = join(__dirname, '..', '..', 'package.json');
    const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));

    if (typeof parsed === 'object' && parsed !== null && 'version' in parsed) {
      const version = (parsed as { version: unknown }).version;

      if (typeof version === 'string' && version.length > 0) {
        return version;
      }
    }
  } catch {
    // Fall through to the constant below.
  }

  return FALLBACK_VERSION;
};

export const APP_NAME = 'Rental Admin API';
export const APP_VERSION = readVersion();
export const API_PREFIX = '/api/v1';
