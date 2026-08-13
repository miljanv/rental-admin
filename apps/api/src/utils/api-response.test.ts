import { API_ERROR_CODES } from '@rental-admin/shared';
import { describe, expect, it } from 'vitest';

import { buildErrorBody, buildPaginationMeta, buildSuccessBody } from './api-response';

describe('buildSuccessBody', () => {
  it('wraps the payload in the standard success envelope', () => {
    expect(buildSuccessBody({ id: 'abc' })).toEqual({ success: true, data: { id: 'abc' } });
  });
});

describe('buildErrorBody', () => {
  it('wraps the error in the standard error envelope', () => {
    expect(buildErrorBody({ code: API_ERROR_CODES.NOT_FOUND, message: 'File not found.' })).toEqual(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'File not found.' },
      },
    );
  });

  it('includes details only when they are provided', () => {
    const withDetails = buildErrorBody({
      code: API_ERROR_CODES.VALIDATION_ERROR,
      message: 'Invalid request data',
      details: { fieldErrors: { size: ['File is larger than the 25 MB limit.'] } },
    });

    expect(withDetails.error.details).toEqual({
      fieldErrors: { size: ['File is larger than the 25 MB limit.'] },
    });
    expect(
      buildErrorBody({ code: API_ERROR_CODES.INTERNAL_ERROR, message: 'x', details: undefined }),
    ).not.toHaveProperty('error.details');
  });
});

describe('buildPaginationMeta', () => {
  it('computes the page count', () => {
    expect(buildPaginationMeta({ page: 1, limit: 10, total: 25 })).toEqual({
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it('reports zero pages for an empty result set', () => {
    expect(buildPaginationMeta({ page: 1, limit: 10, total: 0 })).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
  });
});
