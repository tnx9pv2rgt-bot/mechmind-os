/**
 * Notification Integration Service
 * Auto-send triggers for MechMind OS events
 *
 * Integration Points:
 * - Auto-send on booking created
 * - Auto-send 24h before appointment
 * - Auto-send on invoice generated
 * - Auto-send on inspection completed
 */

import { NotificationType, NotificationChannel } from '@/types/notifications';

// The notification service returns this shape from createNotification
type SendNotificationResponse = {
  id: string;
  customerId: string | null;
  type: string;
  status: string;
  createdAt: Date;
};
import {
  sendNotification,
  sendBookingConfirmation,
  sendBookingReminder,
  sendInvoiceReady,
  sendInspectionComplete,
  sendVehicleReady,
  sendMaintenanceDue,
  queueNotification,
} from './notificationService';

// Configuration for auto-send triggers
interface AutoSendConfig {
  bookingCreated: boolean;
  bookingReminder24h: boolean;
  invoiceGenerated: boolean;
  inspectionCompleted: boolean;
  maintenanceDue: boolean;
  vehicleReady: boolean;
}

// Default configuration
const defaultConfig: AutoSendConfig = {
  bookingCreated: true,
  bookingReminder24h: true,
  invoiceGenerated: true,
  inspectionCompleted: true,
  maintenanceDue: false,
  vehicleReady: true,
};

// Get configuration from localStorage or use defaults
function getConfig(): AutoSendConfig {
  if (typeof window === 'undefined') return defaultConfig;

  const stored = localStorage.getItem('notification_auto_send_config');
  if (stored) {
    try {
      return { ...defaultConfig, ...JSON.parse(stored) };
    } catch {
      return defaultConfig;
    }
  }
  return defaultConfig;
}

// Save configuration
function saveConfig(config: AutoSendConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('notification_auto_send_config', JSON.stringify(config));
}

// ==========================================
// BOOKING INTEGRATIONS
// ==========================================

/**
 * Trigger: Booking Created
 * Auto-send booking confirmation notification
 */
export async function onBookingCreated(
  customerId: string,
  bookingData: {
    customerName: string;
    service: string;
    date: string; // ISO date string
    time: string;
    vehicle: string;
    bookingCode: string;
    workshopName?: string;
    notes?: string;
  },
  tenantId: string
): Promise<SendNotificationResponse | null> {
  const config = getConfig();
  if (!config.bookingCreated) return null;

  return sendBookingConfirmation(customerId, {
    bookingId: bookingData.bookingCode,
    date: bookingData.date,
    time: bookingData.time,
  });
}

/**
 * Schedule: 24h Before Appointment
 * Schedule booking reminder for 24 hours before appointment
 */
export async function scheduleBookingReminder24h(
  customerId: string,
  bookingData: {
    customerName: string;
    service: string;
    date: string; // ISO date string
    time: string;
    vehicle: string;
    bookingCode: string;
    location?: string;
  },
  tenantId: string
): Promise<SendNotificationResponse | null> {
  const config = getConfig();
  if (!config.bookingReminder24h) return null;

  // Calculate reminder time (24 hours before appointment)
  const appointmentDate = new Date(`${bookingData.date}T${bookingData.time}`);
  const reminderDate = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000);

  // Don't schedule if appointment is less than 24 hours away
  if (reminderDate < new Date()) {
    // Send immediately if within 24h
    return sendBookingReminder(customerId, {
      bookingId: bookingData.bookingCode,
      date: bookingData.date,
      time: bookingData.time,
    });
  }

  // Queue notification for later
  return queueNotification({
    customerId,
    tenantId,
    type: NotificationType.BOOKING_REMINDER,
    channel: NotificationChannel.AUTO,
    scheduledAt: reminderDate.toISOString(),
    metadata: {
      ...bookingData,
      reminderType: '24h',
    },
  });
}

/**
 * Trigger: Booking Cancelled
 * Auto-send booking cancellation notification
 */
export async function onBookingCancelled(
  customerId: string,
  bookingData: {
    customerName: string;
    date: string;
    time: string;
    bookingCode: string;
  },
  tenantId: string
): Promise<SendNotificationResponse> {
  return sendNotification({
    customerId,
    tenantId,
    type: NotificationType.BOOKING_CANCELLED,
    channel: NotificationChannel.AUTO,
    metadata: bookingData,
  });
}

/**
 * Trigger: Booking Rescheduled
 * Auto-send booking rescheduling notification
 */
export async function onBookingRescheduled(
  customerId: string,
  bookingData: {
    customerName: string;
    service: string;
    oldDate: string;
    oldTime: string;
    newDate: string;
    newTime: string;
    vehicle: string;
    bookingCode: string;
  },
  tenantId: string
): Promise<SendNotificationResponse> {
  return sendNotification({
    customerId,
    tenantId,
    type: NotificationType.STATUS_UPDATE,
    channel: NotificationChannel.AUTO,
    metadata: {
      ...bookingData,
      status: 'Appuntamento spostato',
    },
  });
}

// ==========================================
// INVOICE INTEGRATIONS
// ==========================================

/**
 * Trigger: Invoice Generated
 * Auto-send invoice ready notification
 */
export async function onInvoiceGenerated(
  customerId: string,
  invoiceData: {
    customerName: string;
    invoiceNumber: string;
    invoiceDate: string;
    amount: string;
    downloadUrl: string;
  },
  tenantId: string
): Promise<SendNotificationResponse | null> {
  const config = getConfig();
  if (!config.invoiceGenerated) return null;

  return sendInvoiceReady(customerId, {
    invoiceId: invoiceData.invoiceNumber,
    amount: parseFloat(invoiceData.amount) || 0,
  });
}

/**
 * Trigger: Payment Reminder
 * Auto-send payment reminder notification
 */
export async function sendPaymentReminder(
  customerId: string,
  paymentData: {
    customerName: string;
    amount: string;
    dueDate: string;
    invoiceNumber: string;
  },
  tenantId: string
): Promise<SendNotificationResponse> {
  return sendNotification({
    customerId,
    tenantId,
    type: NotificationType.PAYMENT_REMINDER,
    channel: NotificationChannel.AUTO,
    metadata: paymentData,
  });
}

// ==========================================
// INSPECTION INTEGRATIONS
// ==========================================

/**
 * Trigger: Inspection Completed
 * Auto-send inspection complete notification
 */
export async function onInspectionCompleted(
  customerId: string,
  inspectionData: {
    customerName: string;
    score?: string;
    reportUrl?: string;
    findings?: string[];
    vehicle?: string;
  },
  tenantId: string
): Promise<SendNotificationResponse | null> {
  const config = getConfig();
  if (!config.inspectionCompleted) return null;

  return sendInspectionComplete(customerId, {
    inspectionId: inspectionData.reportUrl || '',
    vehiclePlate: inspectionData.vehicle || '',
  });
}

// ==========================================
// VEHICLE INTEGRATIONS
// ==========================================

/**
 * Trigger: Vehicle Ready
 * Auto-send vehicle ready notification
 */
export async function onVehicleReady(
  customerId: string,
  vehicleData: {
    customerName: string;
    vehicle: string;
    pickupTime?: string;
    totalAmount?: string;
  },
  tenantId: string
): Promise<SendNotificationResponse | null> {
  const config = getConfig();
  if (!config.vehicleReady) return null;

  return sendVehicleReady(customerId, {
    vehiclePlate: vehicleData.vehicle,
    totalCost: vehicleData.totalAmount ? parseFloat(vehicleData.totalAmount) : undefined,
  });
}

/**
 * Trigger: Maintenance Due
 * Auto-send maintenance due notification
 */
export async function onMaintenanceDue(
  customerId: string,
  maintenanceData: {
    customerName: string;
    service: string;
    days: number;
    lastServiceDate?: string;
    mileage?: number;
  },
  tenantId: string
): Promise<SendNotificationResponse | null> {
  const config = getConfig();
  if (!config.maintenanceDue) return null;

  return sendMaintenanceDue(customerId, {
    vehiclePlate: '',
    maintenanceType: maintenanceData.service,
    dueDate: maintenanceData.lastServiceDate || new Date().toISOString(),
  });
}

// ==========================================
// STATUS UPDATE INTEGRATIONS
// ==========================================

/**
 * Trigger: Vehicle Status Update
 * Auto-send status update notification
 */
export async function onVehicleStatusUpdate(
  customerId: string,
  statusData: {
    customerName: string;
    status: string;
    vehicle?: string;
    link?: string;
    details?: string;
  },
  tenantId: string
): Promise<SendNotificationResponse> {
  return sendNotification({
    customerId,
    tenantId,
    type: NotificationType.STATUS_UPDATE,
    channel: NotificationChannel.AUTO,
    metadata: statusData,
  });
}

// ==========================================
// CONFIGURATION MANAGEMENT
// ==========================================

/**
 * Get current auto-send configuration
 */
export function getAutoSendConfig(): AutoSendConfig {
  return getConfig();
}

/**
 * Update auto-send configuration
 */
export function updateAutoSendConfig(config: Partial<AutoSendConfig>): AutoSendConfig {
  const current = getConfig();
  const updated = { ...current, ...config };
  saveConfig(updated);
  return updated;
}

/**
 * Enable/disable specific auto-send trigger
 */
export function toggleAutoSend(key: keyof AutoSendConfig, enabled: boolean): AutoSendConfig {
  return updateAutoSendConfig({ [key]: enabled });
}

/**
 * Reset auto-send configuration to defaults
 */
export function resetAutoSendConfig(): AutoSendConfig {
  saveConfig(defaultConfig);
  return defaultConfig;
}

// ==========================================
// BATCH OPERATIONS
// ==========================================

/**
 * Send batch booking confirmations
 */
export async function batchBookingConfirmations(
  bookings: Array<{
    customerId: string;
    data: Parameters<typeof sendBookingConfirmation>[1];
  }>,
  tenantId: string
) {
  const results = [];
  for (const booking of bookings) {
    const result = await sendBookingConfirmation(booking.customerId, booking.data);
    results.push({ customerId: booking.customerId, result });
    // Rate limiting - small delay between sends
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return results;
}

/**
 * Send batch reminders for upcoming appointments
 */
export async function batchUpcomingReminders(
  bookings: Array<{
    customerId: string;
    appointmentDate: string;
    data: Parameters<typeof sendBookingReminder>[1];
  }>,
  tenantId: string
) {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Filter bookings for tomorrow
  const tomorrowBookings = bookings.filter(booking => {
    const date = new Date(booking.appointmentDate);
    return (
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear()
    );
  });

  const results = [];
  for (const booking of tomorrowBookings) {
    const result = await sendBookingReminder(booking.customerId, booking.data);
    results.push({ customerId: booking.customerId, result });
  }

  return {
    total: bookings.length,
    scheduled: tomorrowBookings.length,
    results,
  };
}

// ==========================================
// WEBHOOK HANDLERS
// ==========================================

/**
 * Handle Twilio status webhook
 */
export function handleTwilioWebhook(messageId: string, status: string, errorCode?: string): void {
  // In a real implementation, this would update the notification status
  // in the database via the backend API
  console.info('Twilio webhook:', { messageId, status, errorCode });
}

/**
 * Handle SES (Email) status webhook
 */
export function handleSesWebhook(
  messageId: string,
  event: 'delivered' | 'bounced' | 'complaint' | 'opened' | 'clicked'
): void {
  console.info('SES webhook:', { messageId, event });
}

// ==========================================
// MESSAGE TEMPLATES (Italian)
// ==========================================

/**
 * Get message template for notification type
 */
export function getMessageTemplate(type: NotificationType, language: 'it' | 'en' = 'it'): string {
  const templates: Record<string, Record<NotificationType, string>> = {
    it: {
      [NotificationType.BOOKING_CONFIRMATION]:
        'Ciao {customerName}, appuntamento confermato per {date} alle {time}. Ti aspettiamo!',
      [NotificationType.BOOKING_REMINDER]:
        "Ciao {customerName}, ti ricordiamo l'appuntamento domani {date} alle {time}.",
      [NotificationType.BOOKING_CANCELLED]:
        "Ciao {customerName}, l'appuntamento del {date} è stato cancellato.",
      [NotificationType.INVOICE_READY]: 'Ciao {customerName}, fattura pronta. Importo: {amount}.',
      [NotificationType.INSPECTION_COMPLETE]:
        'Ciao {customerName}, ispezione completata!{score, Score: {score}/10}',
      [NotificationType.MAINTENANCE_DUE]:
        'Ciao {customerName}, {service} dovuta tra {days} giorni.',
      [NotificationType.VEHICLE_READY]:
        'Ciao {customerName}, il tuo veicolo è pronto per il ritiro!',
      [NotificationType.STATUS_UPDATE]: 'Ciao {customerName}, aggiornamento: {status}.',
      [NotificationType.PAYMENT_REMINDER]:
        'Ciao {customerName}, promemoria pagamento fattura {amount}.',
      [NotificationType.WELCOME]: 'Benvenuto {customerName}! Grazie per esserti registrato.',
      [NotificationType.PASSWORD_RESET]:
        'Ciao {customerName}, per reimpostare la password clicca qui.',
      [NotificationType.CUSTOM]: '{message}',
      [NotificationType.GDPR_EXPORT_READY]:
        'Ciao {customerName}, i tuoi dati sono pronti per il download.',
    },
    en: {
      [NotificationType.BOOKING_CONFIRMATION]:
        'Hi {customerName}, appointment confirmed for {date} at {time}. See you soon!',
      [NotificationType.BOOKING_REMINDER]:
        'Hi {customerName}, reminder: your appointment is tomorrow {date} at {time}.',
      [NotificationType.BOOKING_CANCELLED]:
        'Hi {customerName}, your appointment on {date} has been cancelled.',
      [NotificationType.INVOICE_READY]:
        'Hi {customerName}, your invoice is ready. Amount: {amount}.',
      [NotificationType.INSPECTION_COMPLETE]:
        'Hi {customerName}, inspection completed!{score, Score: {score}/10}',
      [NotificationType.MAINTENANCE_DUE]: 'Hi {customerName}, {service} due in {days} days.',
      [NotificationType.VEHICLE_READY]: 'Hi {customerName}, your vehicle is ready for pickup!',
      [NotificationType.STATUS_UPDATE]: 'Hi {customerName}, status update: {status}.',
      [NotificationType.PAYMENT_REMINDER]:
        'Hi {customerName}, payment reminder for invoice {amount}.',
      [NotificationType.WELCOME]: 'Welcome {customerName}! Thanks for registering.',
      [NotificationType.PASSWORD_RESET]: 'Hi {customerName}, to reset your password click here.',
      [NotificationType.CUSTOM]: '{message}',
      [NotificationType.GDPR_EXPORT_READY]: 'Hi {customerName}, your data is ready for download.',
    },
  };

  return templates[language]?.[type] || templates['it'][type];
}
