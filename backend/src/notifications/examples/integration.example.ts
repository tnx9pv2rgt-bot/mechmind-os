/**
 * MechMind OS - Notification System Integration Examples
 *
 * Questo file mostra come integrare il sistema di notifiche nei vari servizi.
 */

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  NotificationOrchestratorService,
  NotificationType,
  NotificationChannel,
  EmailService,
  SmsService,
} from '@notifications';

// Example interfaces for demonstration purposes
interface ExampleBooking {
  id: string;
  customerId: string;
  tenantId: string;
  scheduledDate: Date;
  services: { name: string }[];
  vehicle?: { brand: string; model: string; plate: string };
  notes?: string;
}

interface ExampleInvoice {
  id: string;
  customerId: string;
  tenantId: string;
  number: string;
  createdAt: Date;
  total: number;
}

interface ExampleExportJob {
  customer: { name: string; email: string };
  downloadUrl: string;
  expiresAt: string;
  requestId: string;
}

// ============================================================================
// ESEMPIO 1: Booking Service - Invio notifiche automatiche
// ============================================================================

@Injectable()
export class BookingNotificationExample {
  constructor(private readonly notificationService: NotificationOrchestratorService) {}

  /**
   * Quando una prenotazione viene creata
   */
  async onBookingCreated(booking: ExampleBooking): Promise<void> {
    // Notifica automatica con fallback SMS -> Email
    await this.notificationService.notifyCustomer(
      booking.customerId,
      booking.tenantId,
      NotificationType.BOOKING_CONFIRMATION,
      {
        service: booking.services.map(s => s.name).join(', '),
        date: booking.scheduledDate.toLocaleDateString('it-IT'),
        time: booking.scheduledDate.toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        vehicle: booking.vehicle
          ? `${booking.vehicle.brand} ${booking.vehicle.model} ${booking.vehicle.plate}`
          : 'Non specificato',
        bookingCode: booking.id.slice(-8).toUpperCase(),
        notes: booking.notes,
      },
      NotificationChannel.AUTO, // Prova SMS, fallback Email
    );
  }

  /**
   * Quando una prenotazione viene cancellata
   */
  async onBookingCancelled(booking: ExampleBooking, reason?: string): Promise<void> {
    await this.notificationService.notifyCustomer(
      booking.customerId,
      booking.tenantId,
      NotificationType.BOOKING_CANCELLED,
      {
        service: booking.services.map(s => s.name).join(', '),
        date: booking.scheduledDate.toLocaleDateString('it-IT'),
        bookingCode: booking.id.slice(-8).toUpperCase(),
        cancellationReason: reason,
      },
    );
  }

  /**
   * Promemoria programmato (chiamato da Cron Job)
   */
  async sendReminder(booking: ExampleBooking, type: '24h' | 'same_day'): Promise<void> {
    await this.notificationService.notifyCustomer(
      booking.customerId,
      booking.tenantId,
      NotificationType.BOOKING_REMINDER,
      {
        service: booking.services.map(s => s.name).join(', '),
        date: booking.scheduledDate.toLocaleDateString('it-IT'),
        time: booking.scheduledDate.toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        vehicle: booking.vehicle
          ? `${booking.vehicle.brand} ${booking.vehicle.model}`
          : 'Non specificato',
        bookingCode: booking.id.slice(-8).toUpperCase(),
        reminderType: type,
      },
      NotificationChannel.AUTO,
    );
  }
}

// ============================================================================
// ESEMPIO 2: Invoice Service - Notifica fattura
// ============================================================================

@Injectable()
export class InvoiceNotificationExample {
  constructor(private readonly notificationService: NotificationOrchestratorService) {}

  async onInvoiceCreated(invoice: ExampleInvoice): Promise<void> {
    await this.notificationService.notifyCustomer(
      invoice.customerId,
      invoice.tenantId,
      NotificationType.INVOICE_READY,
      {
        invoiceNumber: invoice.number,
        invoiceDate: invoice.createdAt.toLocaleDateString('it-IT'),
        amount: invoice.total.toFixed(2),
        downloadUrl: `https://mechmind.io/invoices/${invoice.id}/download`,
      },
      // Per fatture, usa email per sicurezza
      NotificationChannel.EMAIL,
    );
  }
}

// ============================================================================
// ESEMPIO 3: GDPR Service - Esportazione dati
// ============================================================================

@Injectable()
export class GdprNotificationExample {
  constructor(private readonly emailService: EmailService) {}

  async onExportReady(exportJob: ExampleExportJob): Promise<void> {
    // GDPR: sempre via email per sicurezza
    await this.emailService.sendGdprDataExport({
      customerName: exportJob.customer.name,
      customerEmail: exportJob.customer.email,
      downloadUrl: exportJob.downloadUrl,
      expiryDate: new Date(exportJob.expiresAt).toLocaleDateString('it-IT'),
      requestId: exportJob.requestId,
    });
  }
}

// ============================================================================
// ESEMPIO 4: Event Listeners con @OnEvent
// ============================================================================

@Injectable()
export class BookingEventListenerExample {
  constructor(private readonly notificationService: NotificationOrchestratorService) {}

  @OnEvent('booking.created')
  async handleBookingCreated(event: {
    bookingId: string;
    customerId: string;
    tenantId: string;
    scheduledDate: Date;
  }): Promise<void> {
    // Recupera i dettagli della prenotazione
    // await this.notificationService.notifyCustomer(...)
    console.log(`Booking created: ${event.bookingId}`);
  }

  @OnEvent('booking.reminder.due')
  async handleReminderDue(event: {
    bookingId: string;
    customerId: string;
    tenantId: string;
    type: '24h' | 'same_day';
  }): Promise<void> {
    // Invia promemoria
    console.log(`Sending ${event.type} reminder for booking: ${event.bookingId}`);
  }
}

// ============================================================================
// ESEMPIO 5: Bulk Notifications
// ============================================================================

@Injectable()
export class BulkNotificationExample {
  constructor(private readonly notificationService: NotificationOrchestratorService) {}

  /**
   * Notifica tutti i clienti di un officina
   */
  async notifyAllCustomers(
    tenantId: string,
    customerIds: string[],
    message: string,
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: unknown[];
  }> {
    const notifications = customerIds.map(customerId => ({
      customerId,
      tenantId,
      type: NotificationType.CUSTOM,
      data: { message },
      channel: NotificationChannel.AUTO,
    }));

    return this.notificationService.sendBulkNotifications(notifications, {
      throttleMs: 100, // 100ms tra ogni notifica
      continueOnError: true, // Continua anche se alcune falliscono
    });
  }

  /**
   * Prenota notifiche per promemoria futuri
   */
  async scheduleReminders(bookings: ExampleBooking[]): Promise<void> {
    for (const booking of bookings) {
      // Prenota reminder 24h prima
      await this.notificationService.queueNotification(
        {
          customerId: booking.customerId,
          tenantId: booking.tenantId,
          type: NotificationType.BOOKING_REMINDER,
          data: {
            // ... dati reminder
          },
          channel: NotificationChannel.AUTO,
        },
        this.calculateDelay(booking.scheduledDate, 24),
      );
    }
  }

  private calculateDelay(targetDate: Date, hoursBefore: number): number {
    const reminderTime = new Date(targetDate.getTime() - hoursBefore * 60 * 60 * 1000);
    return Math.max(0, reminderTime.getTime() - Date.now());
  }
}

// ============================================================================
// ESEMPIO 6: Direct Service Usage (per casi speciali)
// ============================================================================

@Injectable()
export class DirectServiceExample {
  constructor(
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  async sendCustomEmail(): Promise<void> {
    // Email completamente personalizzata
    await this.emailService.sendRawEmail({
      to: 'cliente@example.com',
      subject: 'Offerta Speciale',
      html: '<h1>La tua offerta personalizzata</h1>...',
      tags: [{ name: 'campaign', value: 'summer_sale' }],
    });
  }

  async sendCustomSms(): Promise<void> {
    // SMS personalizzato
    await this.smsService.sendCustom(
      '+393331234567',
      'Ciao! Officina Rossi: il tuo veicolo è pronto per il ritiro.',
      'custom_pickup_ready',
    );
  }

  async calculateSmsCost(): Promise<void> {
    const message =
      'Ciao! La tua prenotazione per Tagliando è confermata. 📅 15/03/2024 alle 14:30 📍 Officina Rossi 🔢 Codice: BK-001';
    const cost = this.smsService.calculateCost(message);

    console.log(`Segments: ${cost.segments}`);
    console.log(`Estimated cost: €${(cost.estimatedCost * 0.92).toFixed(4)}`); // Converti in EUR
  }
}

// ============================================================================
// ESEMPIO 7: Health Check & Monitoring
// ============================================================================

@Injectable()
export class NotificationHealthExample {
  constructor(private readonly smsService: SmsService) {}

  async checkServicesHealth(): Promise<{
    sms: { healthy: boolean; latency?: number; error?: string };
    templates: number;
    timestamp: string;
  }> {
    const [smsHealth, templates] = await Promise.all([
      this.smsService.healthCheck(),
      Promise.resolve(this.smsService.getTemplates()),
    ]);

    return {
      sms: smsHealth,
      templates: templates.length,
      timestamp: new Date().toISOString(),
    };
  }
}
