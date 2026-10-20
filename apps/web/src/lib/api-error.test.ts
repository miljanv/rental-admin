import { AxiosError, CanceledError } from 'axios';
import { describe, expect, it } from 'vitest';

import { parseApiError } from './api-error';

describe('parseApiError', () => {
  it.each(['ECONNABORTED', 'ETIMEDOUT'])('identifies a request timeout (%s)', (code) => {
    const parsed = parseApiError(new AxiosError('timeout of 20000ms exceeded', code));

    expect(parsed).toMatchObject({
      code: 'TIMEOUT',
      isNetworkError: true,
      isCanceled: false,
    });
    expect(parsed.message).toContain('operation may still be running');
    expect(parsed.message).not.toContain('Check your connection');
  });

  it('keeps connection failures distinct from timeouts', () => {
    expect(parseApiError(new AxiosError('Network Error', 'ERR_NETWORK'))).toMatchObject({
      code: 'NETWORK_ERROR',
      isNetworkError: true,
      isCanceled: false,
    });
  });

  it('does not classify a canceled request as a timeout', () => {
    expect(parseApiError(new CanceledError())).toMatchObject({
      code: 'CANCELED',
      isNetworkError: false,
      isCanceled: true,
    });
  });
});
