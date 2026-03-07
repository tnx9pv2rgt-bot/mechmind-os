import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Column,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
  Tailwind,
} from '@react-email/components';

// Common Layout Component
interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

const EmailLayout: React.FC<EmailLayoutProps> = ({ preview, children }) => (
  <Html>
    <Head />
    <Preview>{preview}</Preview>
    <Tailwind
      config={{
        theme: {
          extend: {
            colors: {
              brand: '#0071e3',
              'brand-dark': '#005bb5',
              'gray-50': '#f9fafb',
              'gray-100': '#f3f4f6',
              'gray-200': '#e5e7eb',
              'gray-600': '#4b5563',
              'gray-800': '#1f2937',
              'gray-900': '#111827',
              success: '#22c55e',
              warning: '#f59e0b',
              danger: '#ef4444',
            },
          },
        },
      }}
    >
      <Body className="bg-gray-100 font-sans py-8">
        <Container className="bg-white rounded-lg shadow-lg max-w-[600px] mx-auto overflow-hidden">
          {/* Header */}
          <Section className="bg-brand px-8 py-6">
            <Row>
              <Column>
                <Heading className="text-white text-2xl font-bold m-0">
                  🔧 MechMind
                </Heading>
                <Text className="text-white/80 text-sm m-0 mt-1">
                  Gestione officine intelligente
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Content */}
          <Section className="px-8 py-8">
            {children}
          </Section>

          {/* Footer */}
          <Section className="bg-gray-50 px-8 py-6 border-t border-gray-200">
            <Text className="text-gray-600 text-xs text-center m-0">
              Questa email è stata inviata automaticamente da MechMind OS.
            </Text>
            <Text className="text-gray-600 text-xs text-center m-0 mt-2">
              Per assistenza, contatta il tuo officina di fiducia.
            </Text>
            <Text className="text-gray-500 text-xs text-center m-0 mt-4">
              © {new Date().getFullYear()} MechMind. Tutti i diritti riservati.
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

// Booking Confirmation Email
interface BookingConfirmationEmailProps {
  customerName: string;
  service: string;
  date: string;
  time: string;
  vehicle: string;
  bookingCode: string;
  workshopName: string;
  workshopAddress: string;
  workshopPhone: string;
  notes?: string;
}

export const BookingConfirmationEmail: React.FC<BookingConfirmationEmailProps> = ({
  customerName,
  service,
  date,
  time,
  vehicle,
  bookingCode,
  workshopName,
  workshopAddress,
  workshopPhone,
  notes,
}) => (
  <EmailLayout preview={`✅ Prenotazione Confermata - ${bookingCode}`}>
    <Heading className="text-gray-900 text-2xl font-bold mb-4">
      ✅ Prenotazione Confermata
    </Heading>
    
    <Text className="text-gray-800 text-base mb-6">
      Gentile <strong>{customerName}</strong>,
    </Text>
    
    <Text className="text-gray-600 text-base mb-6">
      La tua prenotazione è stata confermata con successo. Ecco i dettagli:
    </Text>

    {/* Booking Details */}
    <Section className="bg-gray-50 rounded-lg p-6 mb-6">
      <Row className="mb-4">
        <Column>
          <Text className="text-gray-500 text-xs uppercase tracking-wide m-0 mb-1">
            Servizio
          </Text>
          <Text className="text-gray-900 text-lg font-semibold m-0">
            {service}
          </Text>
        </Column>
      </Row>
      
      <Row className="mb-4">
        <Column>
          <Text className="text-gray-500 text-xs uppercase tracking-wide m-0 mb-1">
            Data e Ora
          </Text>
          <Text className="text-gray-900 text-lg font-semibold m-0">
            📅 {date} alle {time}
          </Text>
        </Column>
      </Row>
      
      <Row className="mb-4">
        <Column>
          <Text className="text-gray-500 text-xs uppercase tracking-wide m-0 mb-1">
            Veicolo
          </Text>
          <Text className="text-gray-900 text-lg font-semibold m-0">
            🚗 {vehicle}
          </Text>
        </Column>
      </Row>
      
      <Row>
        <Column>
          <Text className="text-gray-500 text-xs uppercase tracking-wide m-0 mb-1">
            Codice Prenotazione
          </Text>
          <Text className="text-brand text-2xl font-bold m-0 tracking-wide">
            {bookingCode}
          </Text>
        </Column>
      </Row>
    </Section>

    {/* Workshop Info */}
    <Section className="bg-brand/5 border border-brand/20 rounded-lg p-6 mb-6">
      <Text className="text-gray-900 text-lg font-semibold m-0 mb-3">
        📍 {workshopName}
      </Text>
      <Text className="text-gray-600 text-sm m-0 mb-1">
        {workshopAddress}
      </Text>
      <Text className="text-gray-600 text-sm m-0">
        📞 {workshopPhone}
      </Text>
    </Section>

    {notes && (
      <Section className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <Text className="text-yellow-800 text-sm m-0">
          <strong>📝 Note:</strong> {notes}
        </Text>
      </Section>
    )}

    <Text className="text-gray-600 text-sm mb-6">
      Ti ricordiamo di presentarti qualche minuto prima dell&apos;appuntamento. 
      Se hai bisogno di modificare o cancellare la prenotazione, ti preghiamo di contattarci almeno 24 ore prima.
    </Text>

    <Text className="text-gray-800 text-base">
      Grazie per averci scelto!<br />
      <strong>Il team di {workshopName}</strong>
    </Text>
  </EmailLayout>
);

// Booking Reminder Email
interface BookingReminderEmailProps {
  customerName: string;
  service: string;
  date: string;
  time: string;
  vehicle: string;
  bookingCode: string;
  workshopName: string;
  workshopAddress: string;
}

export const BookingReminderEmail: React.FC<BookingReminderEmailProps> = ({
  customerName,
  service,
  date,
  time,
  vehicle,
  bookingCode,
  workshopName,
  workshopAddress,
}) => (
  <EmailLayout preview={`⏰ Promemoria Appuntamento - ${bookingCode}`}>
    <Heading className="text-warning text-2xl font-bold mb-4">
      ⏰ Promemoria Appuntamento
    </Heading>
    
    <Text className="text-gray-800 text-base mb-6">
      Gentile <strong>{customerName}</strong>,
    </Text>
    
    <Text className="text-gray-600 text-base mb-6">
      Ti ricordiamo il tuo appuntamento di domani:
    </Text>

    <Section className="bg-warning/10 border border-warning/30 rounded-lg p-6 mb-6">
      <Row className="mb-4">
        <Column>
          <Text className="text-gray-500 text-xs uppercase tracking-wide m-0 mb-1">
            Data e Ora
          </Text>
          <Text className="text-gray-900 text-xl font-bold m-0">
            📅 {date} alle {time}
          </Text>
        </Column>
      </Row>
      
      <Row className="mb-4">
        <Column>
          <Text className="text-gray-500 text-xs uppercase tracking-wide m-0 mb-1">
            Servizio
          </Text>
          <Text className="text-gray-900 text-lg font-semibold m-0">
            {service}
          </Text>
        </Column>
      </Row>
      
      <Row className="mb-4">
        <Column>
          <Text className="text-gray-500 text-xs uppercase tracking-wide m-0 mb-1">
            Veicolo
          </Text>
          <Text className="text-gray-900 text-base m-0">
            🚗 {vehicle}
          </Text>
        </Column>
      </Row>
      
      <Row>
        <Column>
          <Text className="text-gray-500 text-xs uppercase tracking-wide m-0 mb-1">
            Codice
          </Text>
          <Text className="text-brand text-xl font-bold m-0 tracking-wide">
            {bookingCode}
          </Text>
        </Column>
      </Row>
    </Section>

    <Section className="bg-gray-50 rounded-lg p-6 mb-6">
      <Text className="text-gray-900 text-lg font-semibold m-0 mb-3">
        📍 {workshopName}
      </Text>
      <Text className="text-gray-600 text-sm m-0">
        {workshopAddress}
      </Text>
    </Section>

    <Text className="text-gray-600 text-sm mb-6">
      Ti aspettiamo! Se non puoi presentarti, ti preghiamo di avvisarci al più presto.
    </Text>
  </EmailLayout>
);

// Invoice Ready Email
interface InvoiceReadyEmailProps {
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  amount: string;
  downloadUrl: string;
  workshopName: string;
}

export const InvoiceReadyEmail: React.FC<InvoiceReadyEmailProps> = ({
  customerName,
  invoiceNumber,
  invoiceDate,
  amount,
  downloadUrl,
  workshopName,
}) => (
  <EmailLayout preview={`🧾 Fattura Disponibile - ${invoiceNumber}`}>
    <Heading className="text-success text-2xl font-bold mb-4">
      🧾 Fattura Disponibile
    </Heading>
    
    <Text className="text-gray-800 text-base mb-6">
      Gentile <strong>{customerName}</strong>,
    </Text>
    
    <Text className="text-gray-600 text-base mb-6">
      La tua fattura è stata emessa ed è disponibile per il download.
    </Text>

    <Section className="bg-success/10 border border-success/30 rounded-lg p-6 mb-6">
      <Row className="mb-4">
        <Column>
          <Text className="text-gray-500 text-xs uppercase tracking-wide m-0 mb-1">
            Numero Fattura
          </Text>
          <Text className="text-gray-900 text-xl font-bold m-0">
            #{invoiceNumber}
          </Text>
        </Column>
      </Row>
      
      <Row className="mb-4">
        <Column>
          <Text className="text-gray-500 text-xs uppercase tracking-wide m-0 mb-1">
            Data Emissione
          </Text>
          <Text className="text-gray-900 text-lg font-semibold m-0">
            {invoiceDate}
          </Text>
        </Column>
      </Row>
      
      <Row>
        <Column>
          <Text className="text-gray-500 text-xs uppercase tracking-wide m-0 mb-1">
            Importo Totale
          </Text>
          <Text className="text-success text-3xl font-bold m-0">
            €{amount}
          </Text>
        </Column>
      </Row>
    </Section>

    <Section className="text-center mb-6">
      <Button
        href={downloadUrl}
        className="bg-brand text-white font-semibold py-3 px-8 rounded-lg text-base no-underline inline-block"
      >
        📥 Scarica Fattura
      </Button>
    </Section>

    <Text className="text-gray-500 text-sm text-center mb-6">
      Il link è valido per 30 giorni.
    </Text>

    <Text className="text-gray-800 text-base">
      Grazie per la fiducia!<br />
      <strong>{workshopName}</strong>
    </Text>
  </EmailLayout>
);

// GDPR Data Export Email
interface GdprDataExportEmailProps {
  customerName: string;
  downloadUrl: string;
  expiryDate: string;
  requestId: string;
}

export const GdprDataExportEmail: React.FC<GdprDataExportEmailProps> = ({
  customerName,
  downloadUrl,
  expiryDate,
  requestId,
}) => (
  <EmailLayout preview={`📥 Esportazione Dati Personale - Richiesta ${requestId}`}>
    <Heading className="text-gray-900 text-2xl font-bold mb-4">
      📥 I Tuoi Dati Personali
    </Heading>
    
    <Text className="text-gray-800 text-base mb-6">
      Gentile <strong>{customerName}</strong>,
    </Text>
    
    <Text className="text-gray-600 text-base mb-6">
      Come richiesto, abbiamo preparato l&apos;esportazione dei tuoi dati personali. 
      Il file include tutte le informazioni associate al tuo account.
    </Text>

    <Section className="bg-brand/5 border border-brand/20 rounded-lg p-6 mb-6">
      <Row className="mb-4">
        <Column>
          <Text className="text-gray-500 text-xs uppercase tracking-wide m-0 mb-1">
            ID Richiesta
          </Text>
          <Text className="text-gray-900 text-lg font-mono m-0">
            {requestId}
          </Text>
        </Column>
      </Row>
      
      <Row>
        <Column>
          <Text className="text-gray-500 text-xs uppercase tracking-wide m-0 mb-1">
            Scadenza Download
          </Text>
          <Text className="text-danger text-lg font-semibold m-0">
            ⏰ {expiryDate}
          </Text>
        </Column>
      </Row>
    </Section>

    <Section className="text-center mb-6">
      <Button
        href={downloadUrl}
        className="bg-brand text-white font-semibold py-3 px-8 rounded-lg text-base no-underline inline-block"
      >
        📥 Scarica i Miei Dati
      </Button>
    </Section>

    <Section className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <Text className="text-yellow-800 text-sm m-0">
        <strong>🔒 Sicurezza:</strong> Per proteggere la tua privacy, il link scadrà il {expiryDate}. 
        Scarica i tuoi dati entro questa data.
      </Text>
    </Section>

    <Text className="text-gray-600 text-sm">
      Se non hai richiesto questa esportazione o hai domande sulla privacy, 
      contatta immediatamente il nostro responsabile della protezione dati.
    </Text>
  </EmailLayout>
);

// Welcome Email
interface WelcomeEmailProps {
  customerName: string;
  workshopName: string;
  loginUrl: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  customerName,
  workshopName,
  loginUrl,
}) => (
  <EmailLayout preview={`👋 Benvenuto su ${workshopName}`}>
    <Heading className="text-brand text-2xl font-bold mb-4">
      👋 Benvenuto!
    </Heading>
    
    <Text className="text-gray-800 text-base mb-6">
      Gentile <strong>{customerName}</strong>,
    </Text>
    
    <Text className="text-gray-600 text-base mb-6">
      Siamo felici di darti il benvenuto in <strong>{workshopName}</strong>! 
      Da ora potrai gestire tutti i tuoi interventi comodamente online.
    </Text>

    <Section className="bg-gray-50 rounded-lg p-6 mb-6">
      <Text className="text-gray-900 text-lg font-semibold m-0 mb-4">
        Cosa puoi fare:
      </Text>
      
      <Row className="mb-3">
        <Column>
          <Text className="text-gray-600 text-sm m-0">
            ✅ Prenotare appuntamenti online
          </Text>
        </Column>
      </Row>
      
      <Row className="mb-3">
        <Column>
          <Text className="text-gray-600 text-sm m-0">
            📋 Visualizzare lo storico dei tuoi veicoli
          </Text>
        </Column>
      </Row>
      
      <Row className="mb-3">
        <Column>
          <Text className="text-gray-600 text-sm m-0">
            🧾 Scaricare le tue fatture
          </Text>
        </Column>
      </Row>
      
      <Row>
        <Column>
          <Text className="text-gray-600 text-sm m-0">
            🔔 Ricevere promemoria automatici
          </Text>
        </Column>
      </Row>
    </Section>

    <Section className="text-center mb-6">
      <Button
        href={loginUrl}
        className="bg-brand text-white font-semibold py-3 px-8 rounded-lg text-base no-underline inline-block"
      >
        🔐 Accedi al tuo Account
      </Button>
    </Section>

    <Text className="text-gray-800 text-base">
      A presto!<br />
      <strong>Il team di {workshopName}</strong>
    </Text>
  </EmailLayout>
);

// Password Reset Email
interface PasswordResetEmailProps {
  customerName: string;
  resetUrl: string;
  expiryHours: number;
}

export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({
  customerName,
  resetUrl,
  expiryHours,
}) => (
  <EmailLayout preview="🔐 Reimposta la tua password">
    <Heading className="text-gray-900 text-2xl font-bold mb-4">
      🔐 Reimposta Password
    </Heading>
    
    <Text className="text-gray-800 text-base mb-6">
      Gentile <strong>{customerName}</strong>,
    </Text>
    
    <Text className="text-gray-600 text-base mb-6">
      Hai richiesto di reimpostare la password del tuo account MechMind. 
      Clicca sul pulsante qui sotto per procedere:
    </Text>

    <Section className="text-center mb-6">
      <Button
        href={resetUrl}
        className="bg-brand text-white font-semibold py-3 px-8 rounded-lg text-base no-underline inline-block"
      >
        🔑 Reimposta Password
      </Button>
    </Section>

    <Section className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <Text className="text-yellow-800 text-sm m-0">
        ⏰ Questo link scadrà tra <strong>{expiryHours} ore</strong>.
      </Text>
    </Section>

    <Text className="text-gray-600 text-sm mb-6">
      Se non hai richiesto questa operazione, puoi ignorare questa email. 
      La tua password rimarrà invariata.
    </Text>

    <Text className="text-gray-500 text-xs">
      Se il pulsante non funziona, copia e incolla questo link nel tuo browser:<br />
      <Link href={resetUrl} className="text-brand break-all">
        {resetUrl}
      </Link>
    </Text>
  </EmailLayout>
);

// Booking Cancelled Email
interface BookingCancelledEmailProps {
  customerName: string;
  service: string;
  date: string;
  bookingCode: string;
  workshopName: string;
  cancellationReason?: string;
}

export const BookingCancelledEmail: React.FC<BookingCancelledEmailProps> = ({
  customerName,
  service,
  date,
  bookingCode,
  workshopName,
  cancellationReason,
}) => (
  <EmailLayout preview={`❌ Prenotazione Annullata - ${bookingCode}`}>
    <Heading className="text-danger text-2xl font-bold mb-4">
      ❌ Prenotazione Annullata
    </Heading>
    
    <Text className="text-gray-800 text-base mb-6">
      Gentile <strong>{customerName}</strong>,
    </Text>
    
    <Text className="text-gray-600 text-base mb-6">
      La tua prenotazione è stata annullata.
    </Text>

    <Section className="bg-danger/10 border border-danger/30 rounded-lg p-6 mb-6">
      <Row className="mb-4">
        <Column>
          <Text className="text-gray-500 text-xs uppercase tracking-wide m-0 mb-1">
            Servizio
          </Text>
          <Text className="text-gray-900 text-lg font-semibold m-0">
            {service}
          </Text>
        </Column>
      </Row>
      
      <Row className="mb-4">
        <Column>
          <Text className="text-gray-500 text-xs uppercase tracking-wide m-0 mb-1">
            Data
          </Text>
          <Text className="text-gray-900 text-base m-0">
            📅 {date}
          </Text>
        </Column>
      </Row>
      
      <Row>
        <Column>
          <Text className="text-gray-500 text-xs uppercase tracking-wide m-0 mb-1">
            Codice
          </Text>
          <Text className="text-gray-900 text-lg font-mono m-0">
            {bookingCode}
          </Text>
        </Column>
      </Row>
    </Section>

    {cancellationReason && (
      <Section className="bg-gray-50 rounded-lg p-4 mb-6">
        <Text className="text-gray-600 text-sm m-0">
          <strong>Motivo:</strong> {cancellationReason}
        </Text>
      </Section>
    )}

    <Text className="text-gray-600 text-sm mb-6">
      Se desideri riprogrammare l&apos;appuntamento, contatta {workshopName} 
      o effettua una nuova prenotazione online.
    </Text>

    <Text className="text-gray-800 text-base">
      Ci scusiamo per il disagio.<br />
      <strong>{workshopName}</strong>
    </Text>
  </EmailLayout>
);

// Default export for all templates
export default {
  BookingConfirmationEmail,
  BookingReminderEmail,
  InvoiceReadyEmail,
  GdprDataExportEmail,
  WelcomeEmail,
  PasswordResetEmail,
  BookingCancelledEmail,
};
