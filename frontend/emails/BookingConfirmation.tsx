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
  Hr,
} from '@react-email/components';

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
  customerName = 'Cliente',
  service = 'Servizio',
  date = 'Data',
  time = 'Ora',
  vehicle = 'Veicolo',
  bookingCode = 'BK-000',
  workshopName = 'Officina',
  workshopAddress = 'Indirizzo',
  workshopPhone = 'Telefono',
  notes,
}) => {
  const previewText = `✅ Prenotazione Confermata - ${bookingCode}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
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
              },
            },
          },
        }}
      >
        <Body className="bg-[var(--surface-secondary)] font-sans py-8">
          <Container className="bg-[var(--surface-secondary)] rounded-lg shadow-lg max-w-[600px] mx-auto overflow-hidden">
            {/* Header */}
            <Section className="bg-brand px-8 py-6">
              <Row>
                <Column>
                  <Heading className="text-[var(--text-on-brand)] text-2xl font-bold m-0">
                    🔧 MechMind
                  </Heading>
                  <Text className="text-[var(--text-on-brand)]/80 text-sm m-0 mt-1">
                    Gestione officine intelligente
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* Content */}
            <Section className="px-8 py-8">
              <Heading className="text-[var(--text-primary)] text-2xl font-bold mb-4">
                ✅ Prenotazione Confermata
              </Heading>

              <Text className="text-[var(--text-primary)] text-base mb-6">
                Gentile <strong>{customerName}</strong>,
              </Text>

              <Text className="text-[var(--text-[var(--text-secondary)])] text-base mb-6">
                La tua prenotazione è stata confermata con successo. Ecco i dettagli:
              </Text>

              {/* Booking Details */}
              <Section className="bg-[var(--surface-secondary)] rounded-lg p-6 mb-6">
                <Row className="mb-4">
                  <Column>
                    <Text className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide m-0 mb-1">
                      Servizio
                    </Text>
                    <Text className="text-[var(--text-primary)] text-lg font-semibold m-0">
                      {service}
                    </Text>
                  </Column>
                </Row>

                <Row className="mb-4">
                  <Column>
                    <Text className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide m-0 mb-1">
                      Data e Ora
                    </Text>
                    <Text className="text-[var(--text-primary)] text-lg font-semibold m-0">
                      📅 {date} alle {time}
                    </Text>
                  </Column>
                </Row>

                <Row className="mb-4">
                  <Column>
                    <Text className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide m-0 mb-1">
                      Veicolo
                    </Text>
                    <Text className="text-[var(--text-primary)] text-lg font-semibold m-0">
                      🚗 {vehicle}
                    </Text>
                  </Column>
                </Row>

                <Row>
                  <Column>
                    <Text className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide m-0 mb-1">
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
                <Text className="text-[var(--text-primary)] text-lg font-semibold m-0 mb-3">
                  📍 {workshopName}
                </Text>
                <Text className="text-[var(--text-[var(--text-secondary)])] text-sm m-0 mb-1">
                  {workshopAddress}
                </Text>
                <Text className="text-[var(--text-[var(--text-secondary)])] text-sm m-0">
                  📞 {workshopPhone}
                </Text>
              </Section>

              {notes && (
                <Section className="bg-[var(--status-warning)]/10 border border-[var(--status-warning)]/30 rounded-lg p-4 mb-6">
                  <Text className="text-[var(--status-warning)] text-sm m-0">
                    <strong>📝 Note:</strong> {notes}
                  </Text>
                </Section>
              )}

              <Text className="text-[var(--text-[var(--text-secondary)])] text-sm mb-6">
                Ti ricordiamo di presentarti qualche minuto prima dell&apos;appuntamento.
                Se hai bisogno di modificare o cancellare la prenotazione, ti preghiamo di contattarci almeno 24 ore prima.
              </Text>

              <Section className="text-center mb-6">
                <Button
                  href={`https://mechmind.it/booking/${bookingCode}`}
                  className="bg-brand text-[var(--text-on-brand)] font-semibold py-3 px-8 rounded-lg text-base no-underline inline-block"
                >
                  Gestisci Prenotazione
                </Button>
              </Section>

              <Text className="text-[var(--text-primary)] text-base">
                Grazie per averci scelto!
                <br />
                <strong>Il team di {workshopName}</strong>
              </Text>
            </Section>

            {/* Footer */}
            <Section className="bg-[var(--surface-secondary)] px-8 py-6 border-t border-[var(--border-default)]">
              <Text className="text-[var(--text-[var(--text-secondary)])] text-xs text-center m-0">
                Questa email è stata inviata automaticamente da MechMind OS.
              </Text>
              <Text className="text-[var(--text-[var(--text-secondary)])] text-xs text-center m-0 mt-2">
                Per assistenza, contatta il tuo officina di fiducia.
              </Text>
              <Text className="text-[var(--text-tertiary)] text-xs text-center m-0 mt-4">
                © {new Date().getFullYear()} MechMind. Tutti i diritti riservati.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default BookingConfirmationEmail;
