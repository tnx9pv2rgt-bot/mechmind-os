/**
 * Notification Templates Index
 * Exports all notification templates
 */

export * from './it';
export * from './en';

import { itTemplates, itTemplatesExtended, TemplateVariables } from './it';
import { enTemplates, enTemplatesExtended } from './en';

export type NotificationType = 
  | 'BOOKING_REMINDER'
  | 'BOOKING_CONFIRMATION'
  | 'STATUS_UPDATE'
  | 'INVOICE_READY'
  | 'MAINTENANCE_DUE'
  | 'INSPECTION_COMPLETE'
  | 'PAYMENT_REMINDER';

export type NotificationChannel = 'SMS' | 'WHATSAPP' | 'EMAIL';

export interface TemplateConfig {
  type: NotificationType;
  channel: NotificationChannel;
  language: 'it' | 'en' | 'de';
  variables: TemplateVariables;
}

/**
 * Get templates by language
 */
export function getTemplatesByLanguage(lang: 'it' | 'en' | 'de') {
  switch (lang) {
    case 'en':
      return { ...enTemplates, ...enTemplatesExtended };
    case 'it':
    default:
      return { ...itTemplates, ...itTemplatesExtended };
  }
}

/**
 * Render notification template
 */
export function renderTemplate(
  type: string,
  language: 'it' | 'en' | 'de',
  variables: TemplateVariables
): string {
  const templates = getTemplatesByLanguage(language);
  const template = templates[type];
  
  if (!template) {
    console.warn(`Template not found: ${type} for language ${language}`);
    // Fallback to status update
    return templates['STATUS_UPDATE']?.(variables) || 'Notification message';
  }
  
  return template(variables);
}

/**
 * Get all available template types
 */
export function getAvailableTemplateTypes(): { 
  type: string; 
  name: string; 
  description: string;
  channels: NotificationChannel[];
}[] {
  return [
    {
      type: 'BOOKING_REMINDER',
      name: 'Booking Reminder',
      description: 'Sent 24h before appointment',
      channels: ['SMS', 'WHATSAPP', 'EMAIL'],
    },
    {
      type: 'BOOKING_CONFIRMATION',
      name: 'Booking Confirmation',
      description: 'Sent when booking is confirmed',
      channels: ['SMS', 'WHATSAPP', 'EMAIL'],
    },
    {
      type: 'STATUS_UPDATE',
      name: 'Status Update',
      description: 'Vehicle status updates',
      channels: ['SMS', 'WHATSAPP', 'EMAIL'],
    },
    {
      type: 'INVOICE_READY',
      name: 'Invoice Ready',
      description: 'Invoice available notification',
      channels: ['SMS', 'WHATSAPP', 'EMAIL'],
    },
    {
      type: 'MAINTENANCE_DUE',
      name: 'Maintenance Due',
      description: 'Scheduled maintenance reminder',
      channels: ['SMS', 'WHATSAPP', 'EMAIL'],
    },
    {
      type: 'INSPECTION_COMPLETE',
      name: 'Inspection Complete',
      description: 'DVI inspection results',
      channels: ['SMS', 'WHATSAPP', 'EMAIL'],
    },
    {
      type: 'PAYMENT_REMINDER',
      name: 'Payment Reminder',
      description: 'Invoice payment reminder',
      channels: ['SMS', 'WHATSAPP', 'EMAIL'],
    },
  ];
}

/**
 * Calculate SMS segments
 * GSM-7: 160 chars for single, 153 for concatenated
 * UCS-2 (Unicode): 70 chars for single, 67 for concatenated
 */
export function calculateSmsSegments(message: string): { segments: number; encoding: 'GSM-7' | 'UCS-2' } {
  const hasUnicode = /[^\u0000-\u007F]/.test(message);
  const encoding: 'GSM-7' | 'UCS-2' = hasUnicode ? 'UCS-2' : 'GSM-7';
  
  if (hasUnicode) {
    const segmentLength = message.length <= 70 ? 70 : 67;
    return { segments: Math.ceil(message.length / segmentLength), encoding };
  } else {
    const segmentLength = message.length <= 160 ? 160 : 153;
    return { segments: Math.ceil(message.length / segmentLength), encoding };
  }
}

/**
 * Estimate SMS cost (Twilio Italy rates)
 */
export function estimateSmsCost(message: string, count: number = 1): { 
  segments: number; 
  costPerSegment: number;
  totalCost: number;
  currency: string;
} {
  const { segments } = calculateSmsSegments(message);
  const costPerSegment = 0.0075; // USD per segment for Italy
  
  return {
    segments,
    costPerSegment,
    totalCost: segments * costPerSegment * count,
    currency: 'USD',
  };
}

/**
 * Truncate message to fit in single SMS
 */
export function truncateToSingleSms(message: string, maxLength: number = 160): string {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength - 3) + '...';
}
