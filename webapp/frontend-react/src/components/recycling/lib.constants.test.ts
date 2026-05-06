import { describe, expect, it } from 'vitest';
import { PAGE_SIZE } from './lib';

describe('recycling constants', () => {
  it('PAGE_SIZE = 12', () => {
    expect(PAGE_SIZE).toBe(12);
  });
});
