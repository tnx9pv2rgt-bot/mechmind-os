/**
 * Italian Notification Templates
 * SMS/WhatsApp message templates in Italian
 */

export interface TemplateVariables {
  customerName: string;
  date?: string;
  time?: string;
  location?: string;
  status?: string;
  amount?: string;
  link?: string;
  service?: string;
  days?: number;
  score?: string;
  bookingCode?: string;
  workshopName?: string;
  invoiceNumber?: string;
  vehiclePlate?: string;
}

export type TemplateFunction = (vars: TemplateVariables) => string;

export const itTemplates: Record<string, TemplateFunction> = {
  BOOKING_REMINDER: (v) =>
    `Ciao ${v.customerName}, ti ricordiamo l'appuntamento domani ${v.date} alle ${v.time}${v.location ? ` presso ${v.location}` : ''}. Conferma o modifica: ${v.link || 'https://mechmind.io/portal'}`,

  BOOKING_CONFIRMATION: (v) =>
    `Ciao ${v.customerName}, appuntamento confermato per ${v.date} alle ${v.time}${v.workshopName ? ` da ${v.workshopName}` : ''}${v.bookingCode ? ` (Codice: ${v.bookingCode})` : ''}. Ti aspettiamo!`,

  STATUS_UPDATE: (v) =>
    `Ciao ${v.customerName}, aggiornamento stato: ${v.status || 'in lavorazione'}${v.vehiclePlate ? ` - Veicolo: ${v.vehiclePlate}` : ''}. ${v.link ? `Dettagli: ${v.link}` : ''}`,

  INVOICE_READY: (v) =>
    `Ciao ${v.customerName}, fattura ${v.invoiceNumber || ''} pronta. Importo: ${v.amount || 'N/D'}. Visualizza: ${v.link || 'https://mechmind.io/portal'}`,

  MAINTENANCE_DUE: (v) =>
    `Ciao ${v.customerName}, ${v.service || 'manutenzione'} dovuta tra ${v.days || 'pochi'} giorni per il tuo veicolo${v.vehiclePlate ? ` ${v.vehiclePlate}` : ''}. Prenota: ${v.link || 'https://mechmind.io/portal'}`,

  INSPECTION_COMPLETE: (v) =>
    `Ciao ${v.customerName}, ispezione completata!${v.score ? ` Valutazione: ${v.score}/10` : ''}${v.vehiclePlate ? ` - Veicolo: ${v.vehiclePlate}` : ''}${v.link ? `. Report: ${v.link}` : ''}`,

  PAYMENT_REMINDER: (v) =>
    `Ciao ${v.customerName}, promemoria pagamento fattura ${v.invoiceNumber || ''}${v.amount ? ` di ${v.amount}` : ''}. Paga qui: ${v.link || 'https://mechmind.io/portal'}`,
};

/**
 * Extended templates with more formatting options
 */
export const itTemplatesExtended = {
  BOOKING_REMINDER_SHORT: (v: TemplateVariables) =>
    `Promemoria: appuntamento domani ${v.time} da ${v.workshopName || 'MechMind'}. Codice: ${v.bookingCode}`,

  BOOKING_REMINDER_LONG: (v: TemplateVariables) =>
    `Ciao ${v.customerName},\n\nTi ricordiamo che hai un appuntamento prenotato per domani:\n📅 Data: ${v.date}\n⏰ Ora: ${v.time}\n📍 Location: ${v.location || v.workshopName || 'Il nostro centro'}\n🔢 Codice: ${v.bookingCode}\n\nPer modifiche o cancellazioni: ${v.link || 'https://mechmind.io/portal'}\n\nGrazie,\nTeam MechMind`,

  INSPECTION_REPORT_READY: (v: TemplateVariables) =>
    `Ciao ${v.customerName}, il report dell'ispezione del tuo veicolo${v.vehiclePlate ? ` ${v.vehiclePlate}` : ''} è pronto!${v.score ? ` Valutazione complessiva: ${v.score}/10` : ''} Visualizza il report completo: ${v.link || 'https://mechmind.io/portal'}`,

  SERVICE_COMPLETED: (v: TemplateVariables) =>
    `Ciao ${v.customerName}, il servizio ${v.service || ''} sul tuo veicolo${v.vehiclePlate ? ` ${v.vehiclePlate}` : ''} è stato completato. Puoi ritirare il veicolo${v.location ? ` presso ${v.location}` : ''}. ${v.link ? `Dettagli: ${v.link}` : ''}`,

  PARTS_ARRIVED: (v: TemplateVariables) =>
    `Ciao ${v.customerName}, i ricambi ordinati per il tuo veicolo${v.vehiclePlate ? ` ${v.vehiclePlate}` : ''} sono arrivati. Ti contatteremo presto per fissare l'appuntamento di installazione.`,

  SPECIAL_OFFER: (v: TemplateVariables) =>
    `Ciao ${v.customerName}, abbiamo un'offerta speciale per te! ${v.service || 'Manutenzione'} a prezzo scontato. Prenota entro ${v.days || '7'} giorni: ${v.link || 'https://mechmind.io/portal'}`,

  FEEDBACK_REQUEST: (v: TemplateVariables) =>
    `Ciao ${v.customerName}, grazie per aver scelto ${v.workshopName || 'MechMind'}! Ci piacerebbe sapere la tua opinione. Lascia una recensione: ${v.link || 'https://mechmind.io/feedback'}`,
};

/**
 * Get template by type with fallback
 */
export function getItalianTemplate(type: string): TemplateFunction {
  return itTemplates[type] || itTemplates.STATUS_UPDATE;
}

/**
 * Render template with variables
 */
export function renderItalianTemplate(
  type: string,
  variables: TemplateVariables
): string {
  const template = getItalianTemplate(type);
  return template(variables);
}
