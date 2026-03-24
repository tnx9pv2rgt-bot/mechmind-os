/**
 * Notification Events Map
 *
 * Defines all notification events with their channels, templates, and subjects.
 * Used by NotificationTriggersService to dispatch notifications.
 */

export const NOTIFICATION_EVENTS = {
  // Booking
  BOOKING_CONFIRMED: {
    channels: ['EMAIL', 'SMS'] as const,
    template: 'booking-confirmed',
    subject: 'Prenotazione confermata',
  },
  BOOKING_REMINDER_24H: {
    channels: ['SMS'] as const,
    template: 'booking-reminder',
    subject: 'Promemoria appuntamento domani',
  },
  BOOKING_CANCELLED: {
    channels: ['EMAIL'] as const,
    template: 'booking-cancelled',
    subject: 'Prenotazione cancellata',
  },

  // Vehicle
  VEHICLE_CHECKED_IN: {
    channels: ['EMAIL'] as const,
    template: 'vehicle-checked-in',
    subject: 'Veicolo accettato in officina',
  },
  VEHICLE_READY: {
    channels: ['EMAIL', 'SMS'] as const,
    template: 'vehicle-ready',
    subject: 'Il tuo veicolo è pronto per il ritiro',
  },

  // DVI
  INSPECTION_REPORT_SENT: {
    channels: ['EMAIL', 'SMS'] as const,
    template: 'inspection-report',
    subject: 'Report ispezione veicolo disponibile',
  },

  // Estimate
  ESTIMATE_SENT: {
    channels: ['EMAIL'] as const,
    template: 'estimate-sent',
    subject: 'Preventivo disponibile per approvazione',
  },
  ESTIMATE_APPROVED: {
    channels: ['IN_APP'] as const,
    template: 'estimate-approved',
    subject: 'Preventivo approvato dal cliente',
  },
  ESTIMATE_REJECTED: {
    channels: ['IN_APP'] as const,
    template: 'estimate-rejected',
    subject: 'Preventivo rifiutato dal cliente',
  },

  // Invoice
  INVOICE_SENT: {
    channels: ['EMAIL'] as const,
    template: 'invoice-sent',
    subject: 'Fattura disponibile',
  },
  PAYMENT_RECEIVED: {
    channels: ['EMAIL'] as const,
    template: 'payment-received',
    subject: 'Pagamento ricevuto',
  },

  // Maintenance
  MAINTENANCE_DUE: {
    channels: ['EMAIL', 'SMS'] as const,
    template: 'maintenance-due',
    subject: 'Promemoria manutenzione veicolo',
  },

  // Warranty
  WARRANTY_EXPIRING: {
    channels: ['EMAIL'] as const,
    template: 'warranty-expiring',
    subject: 'Garanzia in scadenza',
  },

  // Work Order
  WORK_ORDER_STATUS_CHANGED: {
    channels: ['IN_APP'] as const,
    template: 'wo-status-changed',
    subject: 'Aggiornamento stato ordine di lavoro',
  },
  PARTS_ARRIVED: {
    channels: ['IN_APP', 'SMS'] as const,
    template: 'parts-arrived',
    subject: 'Ricambi arrivati — lavoro può riprendere',
  },

  // Review
  REVIEW_REQUEST: {
    channels: ['SMS', 'EMAIL'] as const,
    template: 'review-request',
    subject: 'Come ti sei trovato? Lascia una recensione',
  },
} as const;

export type NotificationEventKey = keyof typeof NOTIFICATION_EVENTS;
