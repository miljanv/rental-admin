import { describe, expect, it } from 'vitest';

import { scaledSize } from './prepare-receipt';

describe('scaledSize', () => {
  it('shrinks the longest edge to the limit and keeps the ratio', () => {
    expect(scaledSize(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(scaledSize(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it('never enlarges a small image', () => {
    expect(scaledSize(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});
