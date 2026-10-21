export type EnhancementPreset = 'original' | 'magic' | 'mono';

export interface ScanPage {
  id: string;
  source: string;
  preset: EnhancementPreset;
  rotation: number;
  createdAt: number;
}

export interface ScanDocument {
  id: string;
  title: string;
  pages: ScanPage[];
  createdAt: number;
  updatedAt: number;
}
