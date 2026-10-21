import { describe, expect, it } from 'vitest';
import { createPage, getPresetFilter, rotateQuarterTurn, sortDocuments } from './scan';

describe('scan helpers', () => {
  it('creates a page with a clean default editing state', () => {
    const page = createPage('data:image/jpeg;base64,abc');

    expect(page.source).toContain('data:image/jpeg');
    expect(page.preset).toBe('original');
    expect(page.rotation).toBe(0);
    expect(page.id).toMatch(/^page-/);
  });

  it('wraps rotations in quarter turns', () => {
    expect(rotateQuarterTurn(270)).toBe(0);
    expect(rotateQuarterTurn(0, -1)).toBe(270);
  });

  it('keeps recent documents first', () => {
    const older = { id: 'old', updatedAt: 1 } as never;
    const newer = { id: 'new', updatedAt: 2 } as never;

    expect(sortDocuments([older, newer]).map((document) => document.id)).toEqual(['new', 'old']);
  });

  it('returns distinct visual filters for each preset', () => {
    expect(getPresetFilter('original')).toBe('none');
    expect(getPresetFilter('magic')).toContain('contrast');
    expect(getPresetFilter('mono')).toContain('grayscale');
  });
});
