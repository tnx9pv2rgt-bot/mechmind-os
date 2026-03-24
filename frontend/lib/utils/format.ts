/**
 * Formatting utilities — Italian locale
 * MechMind OS
 */

import { format, formatDistanceToNow, isYesterday, isToday } from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * Format amount as Italian EUR currency: €1.234,56
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Format date: 20 mar 2026
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'd MMM yyyy', { locale: it });
}

/**
 * Format date + time: 20 mar 2026, 14:30
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, "d MMM yyyy, HH:mm", { locale: it });
}

/**
 * Format Italian phone number: +39 333 123 4567
 */
export function formatPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');

  // With country code
  if (cleaned.startsWith('39') && cleaned.length >= 12) {
    const national = cleaned.slice(2);
    return `+39 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
  }

  // Mobile (3xx)
  if (cleaned.startsWith('3') && cleaned.length === 10) {
    return `+39 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }

  // Landline (0x)
  if (cleaned.startsWith('0') && cleaned.length >= 9) {
    return `+39 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
  }

  return phone;
}

/**
 * Format Italian license plate: AB 123 CD
 */
export function formatPlate(plate: string): string {
  if (!plate) return '';
  const cleaned = plate.replace(/[\s-]/g, '').toUpperCase();

  // New format: AA 000 AA
  if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(cleaned)) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`;
  }

  // Old format: AA 000000
  if (/^[A-Z]{2}\d{6}$/.test(cleaned)) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
  }

  return cleaned;
}

/**
 * Format Italian fiscal code: RSSMRA 85M0 1H50 1Z
 */
export function formatFiscalCode(cf: string): string {
  if (!cf) return '';
  const cleaned = cf.replace(/\s/g, '').toUpperCase();
  if (cleaned.length !== 16) return cleaned;
  return `${cleaned.slice(0, 6)} ${cleaned.slice(6, 10)} ${cleaned.slice(10, 14)} ${cleaned.slice(14)}`;
}

/**
 * Format file size: 1,2 MB
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toLocaleString('it-IT', { maximumFractionDigits: 1 })} ${units[i]}`;
}

/**
 * Format percentage: 12,5%
 */
export function formatPercentage(value: number): string {
  return `${value.toLocaleString('it-IT', { maximumFractionDigits: 1 })}%`;
}

/**
 * Format number with Italian thousand separators: 1.234
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('it-IT');
}

/**
 * Human-readable time ago in Italian: "2 ore fa", "ieri", "3 giorni fa"
 */
export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isToday(d)) {
    return formatDistanceToNow(d, { addSuffix: true, locale: it });
  }

  if (isYesterday(d)) {
    return 'ieri';
  }

  return formatDistanceToNow(d, { addSuffix: true, locale: it });
}
