import type { ScanPage } from '../types';
import { getPresetFilter } from './scan';

const MAX_IMAGE_DIMENSION = 1800;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Paperflow could not read this image.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Paperflow could not open this image.'));
    image.src = source;
  });
}

function getImageDimensions(image: HTMLImageElement): { width: number; height: number } {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  if (!width || !height) {
    throw new Error('This image has no readable dimensions.');
  }

  return { width, height };
}

export async function normalizeImageFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`${file.name} is not an image file.`);
  }

  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const { width, height } = getImageDimensions(image);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Paperflow could not prepare this image.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.86);
}

export async function renderPageToDataUrl(page: ScanPage): Promise<string> {
  const image = await loadImage(page.source);
  const { width, height } = getImageDimensions(image);
  const isSideways = page.rotation % 180 !== 0;
  const canvas = document.createElement('canvas');
  canvas.width = isSideways ? height : width;
  canvas.height = isSideways ? width : height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Paperflow could not render this page.');
  }

  context.filter = getPresetFilter(page.preset);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((page.rotation * Math.PI) / 180);
  context.drawImage(image, -width / 2, -height / 2, width, height);
  return canvas.toDataURL('image/jpeg', 0.92);
}
