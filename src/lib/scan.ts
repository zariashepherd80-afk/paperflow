import type { EnhancementPreset, ScanDocument, ScanPage } from '../types';

export const PRESET_LABELS: Record<EnhancementPreset, string> = {
  original: 'Original',
  magic: 'Magic',
  mono: 'Mono',
};

export const PRESET_DESCRIPTIONS: Record<EnhancementPreset, string> = {
  original: 'Keep the capture as-is',
  magic: 'Clean up contrast and color',
  mono: 'Crisp black and white',
};

export function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createPage(source: string): ScanPage {
  return {
    id: createId('page'),
    source,
    preset: 'original',
    rotation: 0,
    createdAt: Date.now(),
  };
}

export function createDocument(pages: ScanPage[], title = 'Untitled scan'): ScanDocument {
  const timestamp = Date.now();

  return {
    id: createId('document'),
    title,
    pages,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function sortDocuments(documents: ScanDocument[]): ScanDocument[] {
  return [...documents].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function rotateQuarterTurn(rotation: number, amount = 1): number {
  return (rotation + amount * 90 + 360) % 360;
}

export function getPresetFilter(preset: EnhancementPreset): string {
  switch (preset) {
    case 'magic':
      return 'contrast(1.16) brightness(1.08) saturate(0.82)';
    case 'mono':
      return 'grayscale(1) contrast(1.18)';
    default:
      return 'none';
  }
}

export function formatDocumentDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(timestamp);
}

export function formatDocumentTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

export function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'paperflow-scan';
}
