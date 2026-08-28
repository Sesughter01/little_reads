import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(price);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getAgeRangeText(min: number, max: number): string {
  return `Ages ${min}–${max}`;
}

export function getStarArray(rating: number): (1 | 0 | 0.5)[] {
  const stars: (1 | 0 | 0.5)[] = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      stars.push(1);
    } else if (i - rating < 1 && i - rating > 0) {
      stars.push(0.5);
    } else {
      stars.push(0);
    }
  }
  return stars;
}

export function generateReference(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `LR-${timestamp}-${random}`.toUpperCase();
}
