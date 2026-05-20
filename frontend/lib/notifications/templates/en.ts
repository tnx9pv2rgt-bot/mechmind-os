/**
 * English Notification Templates
 * SMS/WhatsApp message templates in English
 */

import { TemplateVariables, TemplateFunction } from './it';

export const enTemplates: Record<string, TemplateFunction> = {
  BOOKING_REMINDER: (v) =>
    `Hi ${v.customerName}, reminder: your appointment is tomorrow ${v.date} at ${v.time}${v.location ? ` at ${v.location}` : ''}. Confirm or modify: ${v.link || 'https://mechmind.it/portal'}`,

  BOOKING_CONFIRMATION: (v) =>
    `Hi ${v.customerName}, appointment confirmed for ${v.date} at ${v.time}${v.workshopName ? ` at ${v.workshopName}` : ''}${v.bookingCode ? ` (Code: ${v.bookingCode})` : ''}. See you soon!`,

  STATUS_UPDATE: (v) =>
    `Hi ${v.customerName}, status update: ${v.status || 'in progress'}${v.vehiclePlate ? ` - Vehicle: ${v.vehiclePlate}` : ''}. ${v.link ? `Details: ${v.link}` : ''}`,

  INVOICE_READY: (v) =>
    `Hi ${v.customerName}, invoice ${v.invoiceNumber || ''} is ready. Amount: ${v.amount || 'N/A'}. View: ${v.link || 'https://mechmind.it/portal'}`,

  MAINTENANCE_DUE: (v) =>
    `Hi ${v.customerName}, ${v.service || 'maintenance'} due in ${v.days || 'a few'} days for your vehicle${v.vehiclePlate ? ` ${v.vehiclePlate}` : ''}. Book: ${v.link || 'https://mechmind.it/portal'}`,

  INSPECTION_COMPLETE: (v) =>
    `Hi ${v.customerName}, inspection completed!${v.score ? ` Rating: ${v.score}/10` : ''}${v.vehiclePlate ? ` - Vehicle: ${v.vehiclePlate}` : ''}${v.link ? `. Report: ${v.link}` : ''}`,

  PAYMENT_REMINDER: (v) =>
    `Hi ${v.customerName}, payment reminder for invoice ${v.invoiceNumber || ''}${v.amount ? ` of ${v.amount}` : ''}. Pay here: ${v.link || 'https://mechmind.it/portal'}`,
};

/**
 * Extended templates with more formatting options
 */
export const enTemplatesExtended = {
  BOOKING_REMINDER_SHORT: (v: TemplateVariables) =>
    `Reminder: appointment tomorrow at ${v.time} at ${v.workshopName || 'MechMind'}. Code: ${v.bookingCode}`,

  BOOKING_REMINDER_LONG: (v: TemplateVariables) =>
    `Hi ${v.customerName},\n\nJust a reminder that you have an appointment scheduled for tomorrow:\n📅 Date: ${v.date}\n⏰ Time: ${v.time}\n📍 Location: ${v.location || v.workshopName || 'Our center'}\n🔢 Code: ${v.bookingCode}\n\nTo modify or cancel: ${v.link || 'https://mechmind.it/portal'}\n\nThanks,\nMechMind Team`,

  INSPECTION_REPORT_READY: (v: TemplateVariables) =>
    `Hi ${v.customerName}, the inspection report for your vehicle${v.vehiclePlate ? ` ${v.vehiclePlate}` : ''} is ready!${v.score ? ` Overall rating: ${v.score}/10` : ''} View full report: ${v.link || 'https://mechmind.it/portal'}`,

  SERVICE_COMPLETED: (v: TemplateVariables) =>
    `Hi ${v.customerName}, the ${v.service || ''} service on your vehicle${v.vehiclePlate ? ` ${v.vehiclePlate}` : ''} has been completed. You can pick up your vehicle${v.location ? ` at ${v.location}` : ''}. ${v.link ? `Details: ${v.link}` : ''}`,

  PARTS_ARRIVED: (v: TemplateVariables) =>
    `Hi ${v.customerName}, the parts ordered for your vehicle${v.vehiclePlate ? ` ${v.vehiclePlate}` : ''} have arrived. We'll contact you soon to schedule the installation appointment.`,

  SPECIAL_OFFER: (v: TemplateVariables) =>
    `Hi ${v.customerName}, we have a special offer for you! ${v.service || 'Maintenance'} at a discounted price. Book within ${v.days || '7'} days: ${v.link || 'https://mechmind.it/portal'}`,

  FEEDBACK_REQUEST: (v: TemplateVariables) =>
    `Hi ${v.customerName}, thank you for choosing ${v.workshopName || 'MechMind'}! We'd love to hear your feedback. Leave a review: ${v.link || 'https://mechmind.it/portal'}`,
};

/**
 * Get template by type with fallback
 */
export function getEnglishTemplate(type: string): TemplateFunction {
  return enTemplates[type] || enTemplates.STATUS_UPDATE;
}

/**
 * Render template with variables
 */
export function renderEnglishTemplate(
  type: string,
  variables: TemplateVariables
): string {
  const template = getEnglishTemplate(type);
  return template(variables);
}
