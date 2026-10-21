import type { ScanDocument } from '../types';
import { sortDocuments } from './scan';

export const STORAGE_KEY = 'paperflow.documents.v1';

export function loadDocuments(): ScanDocument[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortDocuments(parsed as ScanDocument[]);
  } catch {
    return [];
  }
}

export function saveDocuments(documents: ScanDocument[]): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    return true;
  } catch {
    return false;
  }
}
