/**
 * Notification Templates API Route
 * GET: List available message templates
 * POST: Preview a template with variables
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { NotificationType, NotificationChannel } from '@/types/notifications';

// Validation schema for preview
const previewSchema = z.object({
  type: z.nativeEnum(NotificationType),
  language: z.enum(['it', 'en']).default('it'),
  variables: z.record(z.string()),
});

// Italian message templates
const italianTemplates: Record<NotificationType, (vars: Record<string, string>) => string> = {
  [NotificationType.BOOKING_CONFIRMATION]: (v) =>
    `Ciao ${v.customerName}, appuntamento confermato per ${v.date} alle ${v.time}${v.workshopName ? ` da ${v.workshopName}` : ''}${v.bookingCode ? ` (Codice: ${v.bookingCode})` : ''}. Ti aspettiamo!`,

  [NotificationType.BOOKING_REMINDER]: (v) =>
    `Ciao ${v.customerName}, ti ricordiamo l'appuntamento domani ${v.date} alle ${v.time}${v.location ? ` presso ${v.location}` : ''}. Conferma o modifica: ${v.link || 'https://mechmind.it/portal'}`,

  [NotificationType.BOOKING_CANCELLED]: (v) =>
    `Ciao ${v.customerName}, l'appuntamento del ${v.date} alle ${v.time} è stato cancellato. Per riprenotare: ${v.link || 'https://mechmind.it/portal'}`,

  [NotificationType.INVOICE_READY]: (v) =>
    `Ciao ${v.customerName}, fattura pronta. Importo: ${v.amount || 'N/D'}. Visualizza: ${v.link || 'https://mechmind.it/portal'}`,

  [NotificationType.INSPECTION_COMPLETE]: (v) =>
    `Ciao ${v.customerName}, ispezione completata!${v.score ? ` Score: ${v.score}/10` : ''}${v.link ? `. Report: ${v.link}` : ''}`,

  [NotificationType.MAINTENANCE_DUE]: (v) =>
    `Ciao ${v.customerName}, ${v.service || 'manutenzione'} dovuta tra ${v.days || 'pochi'} giorni. Prenota: ${v.link || 'https://mechmind.it/portal'}`,

  [NotificationType.VEHICLE_READY]: (v) =>
    `Ciao ${v.customerName}, il tuo ${v.vehicle || 'veicolo'} è pronto per il ritiro!${v.totalAmount ? ` Importo: ${v.totalAmount}` : ''}${v.pickupTime ? ` Orario: ${v.pickupTime}` : ''}`,

  [NotificationType.STATUS_UPDATE]: (v) =>
    `Ciao ${v.customerName}, aggiornamento: ${v.status || 'in lavorazione'}. ${v.link ? `Dettagli: ${v.link}` : ''}`,

  [NotificationType.PAYMENT_REMINDER]: (v) =>
    `Ciao ${v.customerName}, promemoria pagamento fattura ${v.amount ? `di ${v.amount}` : ''}. Paga qui: ${v.link || 'https://mechmind.it/portal'}`,

  [NotificationType.WELCOME]: (v) =>
    `Benvenuto ${v.customerName}! Grazie per esserti registrato su MechMind OS.`,

  [NotificationType.PASSWORD_RESET]: (v) =>
    `Ciao ${v.customerName}, per reimpostare la password clicca qui: ${v.link || 'https://mechmind.it/reset-password'}`,

  [NotificationType.CUSTOM]: (v) =>
    v.message || `Ciao ${v.customerName}, hai un nuovo messaggio da MechMind OS.`,

  [NotificationType.GDPR_EXPORT_READY]: (v) =>
    `Ciao ${v.customerName}, i tuoi dati sono pronti per il download. Link: ${v.link || 'https://mechmind.it/portal'}`,
};

// English message templates
const englishTemplates: Record<NotificationType, (vars: Record<string, string>) => string> = {
  [NotificationType.BOOKING_CONFIRMATION]: (v) =>
    `Hi ${v.customerName}, appointment confirmed for ${v.date} at ${v.time}${v.workshopName ? ` at ${v.workshopName}` : ''}${v.bookingCode ? ` (Code: ${v.bookingCode})` : ''}. See you soon!`,

  [NotificationType.BOOKING_REMINDER]: (v) =>
    `Hi ${v.customerName}, reminder: your appointment is tomorrow ${v.date} at ${v.time}${v.location ? ` at ${v.location}` : ''}. Confirm or modify: ${v.link || 'https://mechmind.it/portal'}`,

  [NotificationType.BOOKING_CANCELLED]: (v) =>
    `Hi ${v.customerName}, your appointment on ${v.date} at ${v.time} has been cancelled. To reschedule: ${v.link || 'https://mechmind.it/portal'}`,

  [NotificationType.INVOICE_READY]: (v) =>
    `Hi ${v.customerName}, your invoice is ready. Amount: ${v.amount || 'N/A'}. View: ${v.link || 'https://mechmind.it/portal'}`,

  [NotificationType.INSPECTION_COMPLETE]: (v) =>
    `Hi ${v.customerName}, inspection completed!${v.score ? ` Score: ${v.score}/10` : ''}${v.link ? `. Report: ${v.link}` : ''}`,

  [NotificationType.MAINTENANCE_DUE]: (v) =>
    `Hi ${v.customerName}, ${v.service || 'maintenance'} due in ${v.days || 'a few'} days. Book: ${v.link || 'https://mechmind.it/portal'}`,

  [NotificationType.VEHICLE_READY]: (v) =>
    `Hi ${v.customerName}, your ${v.vehicle || 'vehicle'} is ready for pickup!${v.totalAmount ? ` Amount: ${v.totalAmount}` : ''}${v.pickupTime ? ` Time: ${v.pickupTime}` : ''}`,

  [NotificationType.STATUS_UPDATE]: (v) =>
    `Hi ${v.customerName}, status update: ${v.status || 'in progress'}. ${v.link ? `Details: ${v.link}` : ''}`,

  [NotificationType.PAYMENT_REMINDER]: (v) =>
    `Hi ${v.customerName}, payment reminder${v.amount ? ` for ${v.amount}` : ''}. Pay here: ${v.link || 'https://mechmind.it/portal'}`,

  [NotificationType.WELCOME]: (v) =>
    `Welcome ${v.customerName}! Thanks for registering on MechMind OS.`,

  [NotificationType.PASSWORD_RESET]: (v) =>
    `Hi ${v.customerName}, to reset your password click here: ${v.link || 'https://mechmind.it/reset-password'}`,

  [NotificationType.CUSTOM]: (v) =>
    v.message || `Hi ${v.customerName}, you have a new message from MechMind OS.`,

  [NotificationType.GDPR_EXPORT_READY]: (v) =>
    `Hi ${v.customerName}, your data is ready for download. Link: ${v.link || 'https://mechmind.it/portal'}`,
};

// Template metadata
const templateMetadata = [
  {
    type: NotificationType.BOOKING_CONFIRMATION,
    name: 'Conferma Prenotazione',
    description: 'Inviato quando una prenotazione viene confermata',
    variables: ['customerName', 'date', 'time', 'vehicle', 'bookingCode', 'workshopName'],
    supportedChannels: [NotificationChannel.SMS, NotificationChannel.WHATSAPP, NotificationChannel.EMAIL],
  },
  {
    type: NotificationType.BOOKING_REMINDER,
    name: 'Promemoria Appuntamento',
    description: 'Inviato 24h prima dell\'appuntamento',
    variables: ['customerName', 'date', 'time', 'location', 'service', 'vehicle'],
    supportedChannels: [NotificationChannel.SMS, NotificationChannel.WHATSAPP, NotificationChannel.EMAIL],
  },
  {
    type: NotificationType.BOOKING_CANCELLED,
    name: 'Cancellazione Appuntamento',
    description: 'Inviato quando un appuntamento viene cancellato',
    variables: ['customerName', 'date', 'time'],
    supportedChannels: [NotificationChannel.SMS, NotificationChannel.WHATSAPP, NotificationChannel.EMAIL],
  },
  {
    type: NotificationType.INVOICE_READY,
    name: 'Fattura Pronta',
    description: 'Notifica quando la fattura è disponibile',
    variables: ['customerName', 'invoiceNumber', 'amount', 'downloadUrl'],
    supportedChannels: [NotificationChannel.SMS, NotificationChannel.WHATSAPP, NotificationChannel.EMAIL],
  },
  {
    type: NotificationType.INSPECTION_COMPLETE,
    name: 'Ispezione Completata',
    description: 'Risultati ispezione digitale del veicolo',
    variables: ['customerName', 'score', 'reportUrl', 'findings'],
    supportedChannels: [NotificationChannel.SMS, NotificationChannel.WHATSAPP, NotificationChannel.EMAIL],
  },
  {
    type: NotificationType.MAINTENANCE_DUE,
    name: 'Manutenzione Dovuta',
    description: 'Promemoria manutenzione periodica',
    variables: ['customerName', 'service', 'days', 'lastServiceDate', 'mileage'],
    supportedChannels: [NotificationChannel.SMS, NotificationChannel.WHATSAPP, NotificationChannel.EMAIL],
  },
  {
    type: NotificationType.VEHICLE_READY,
    name: 'Veicolo Pronto',
    description: 'Notifica quando il veicolo è pronto per il ritiro',
    variables: ['customerName', 'vehicle', 'pickupTime', 'totalAmount'],
    supportedChannels: [NotificationChannel.SMS, NotificationChannel.WHATSAPP, NotificationChannel.EMAIL],
  },
  {
    type: NotificationType.STATUS_UPDATE,
    name: 'Aggiornamento Stato',
    description: 'Aggiornamenti sullo stato del veicolo',
    variables: ['customerName', 'status', 'link'],
    supportedChannels: [NotificationChannel.SMS, NotificationChannel.WHATSAPP, NotificationChannel.EMAIL],
  },
  {
    type: NotificationType.PAYMENT_REMINDER,
    name: 'Promemoria Pagamento',
    description: 'Sollecito pagamento fattura',
    variables: ['customerName', 'amount', 'dueDate'],
    supportedChannels: [NotificationChannel.SMS, NotificationChannel.WHATSAPP, NotificationChannel.EMAIL],
  },
  {
    type: NotificationType.WELCOME,
    name: 'Benvenuto',
    description: 'Messaggio di benvenuto per nuovi clienti',
    variables: ['customerName'],
    supportedChannels: [NotificationChannel.SMS, NotificationChannel.WHATSAPP, NotificationChannel.EMAIL],
  },
  {
    type: NotificationType.PASSWORD_RESET,
    name: 'Reset Password',
    description: 'Link per reimpostare la password',
    variables: ['customerName', 'link'],
    supportedChannels: [NotificationChannel.SMS, NotificationChannel.EMAIL],
  },
  {
    type: NotificationType.CUSTOM,
    name: 'Messaggio Personalizzato',
    description: 'Messaggio personalizzato manuale',
    variables: ['customerName', 'message'],
    supportedChannels: [NotificationChannel.SMS, NotificationChannel.WHATSAPP, NotificationChannel.EMAIL],
  },
  {
    type: NotificationType.GDPR_EXPORT_READY,
    name: 'Esportazione Dati Pronta',
    description: 'Notifica quando l\'esportazione GDPR è disponibile',
    variables: ['customerName', 'link', 'expiryDate'],
    supportedChannels: [NotificationChannel.EMAIL],
  },
];

/**
 * GET /api/notifications/templates
 * Get available message templates
 */
export async function GET() {
  try {
    const templates = templateMetadata.map((meta) => ({
      ...meta,
      defaultMessage: italianTemplates[meta.type]({
        customerName: 'Cliente',
        date: '15/03/2024',
        time: '14:30',
      }),
    }));

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/templates/preview
 * Preview a template with variables
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = previewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { type, language, variables } = validation.data;

    const templates = language === 'en' ? englishTemplates : italianTemplates;
    const template = templates[type];

    if (!template) {
      return NextResponse.json(
        { error: 'Template non trovato' },
        { status: 404 }
      );
    }

    try {
      const message = template(variables);
      return NextResponse.json({ message });
    } catch (error) {
      return NextResponse.json(
        { error: 'Variabili mancanti nel template' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error previewing template:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
