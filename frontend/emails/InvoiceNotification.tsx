import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Column,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
  Tailwind,
} from '@react-email/components';

interface InvoiceNotificationEmailProps {
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  amount: string;
  downloadUrl: string;
  workshopName: string;
  dueDate?: string;
}

export const InvoiceNotificationEmail: React.FC<InvoiceNotificationEmailProps> = ({
  customerName = 'Cliente',
  invoiceNumber = 'INV-000',
  invoiceDate = new Date().toLocaleDateString('it-IT'),
  amount = '0.00',
  downloadUrl = '#',
  workshopName = 'Officina',
  dueDate,
}) => {
  const previewText = `🧾 Fattura Disponibile - ${invoiceNumber}`;

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
                success: '#22c55e',
                'success-light': '#dcfce7',
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
              <Heading className="text-success text-2xl font-bold mb-4">
                🧾 Fattura Disponibile
              </Heading>

              <Text className="text-[var(--text-primary)] text-base mb-6">
                Gentile <strong>{customerName}</strong>,
              </Text>

              <Text className="text-[var(--text-[var(--text-secondary)])] text-base mb-6">
                La tua fattura è stata emessa ed è disponibile per il download.
              </Text>

              {/* Invoice Details */}
              <Section className="bg-success-light border border-success/30 rounded-lg p-6 mb-6">
                <Row className="mb-4">
                  <Column>
                    <Text className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide m-0 mb-1">
                      Numero Fattura
                    </Text>
                    <Text className="text-[var(--text-primary)] text-xl font-bold m-0">
                      #{invoiceNumber}
                    </Text>
                  </Column>
                </Row>

                <Row className="mb-4">
                  <Column>
                    <Text className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide m-0 mb-1">
                      Data Emissione
                    </Text>
                    <Text className="text-[var(--text-primary)] text-lg font-semibold m-0">
                      {invoiceDate}
                    </Text>
                  </Column>
                </Row>

                {dueDate && (
                  <Row className="mb-4">
                    <Column>
                      <Text className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide m-0 mb-1">
                        Data Scadenza
                      </Text>
                      <Text className="text-[var(--text-primary)] text-base m-0">
                        {dueDate}
                      </Text>
                    </Column>
                  </Row>
                )}

                <Row>
                  <Column>
                    <Text className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide m-0 mb-1">
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
                  className="bg-brand text-[var(--text-on-brand)] font-semibold py-3 px-8 rounded-lg text-base no-underline inline-block"
                >
                  📥 Scarica Fattura
                </Button>
              </Section>

              <Text className="text-[var(--text-tertiary)] text-sm text-center mb-6">
                Il link è valido per 30 giorni.
              </Text>

              <Section className="bg-[var(--surface-secondary)] rounded-lg p-4 mb-6">
                <Text className="text-[var(--text-[var(--text-secondary)])] text-sm m-0">
                  <strong>💳 Metodi di pagamento accettati:</strong>
                </Text>
                <Text className="text-[var(--text-[var(--text-secondary)])] text-sm m-0 mt-2">
                  • Bonifico bancario
                  <br />
                  • Carta di credito/debito
                  <br />
                  • Contanti presso la reception
                </Text>
              </Section>

              <Text className="text-[var(--text-primary)] text-base">
                Grazie per la fiducia!
                <br />
                <strong>{workshopName}</strong>
              </Text>
            </Section>

            {/* Footer */}
            <Section className="bg-[var(--surface-secondary)] px-8 py-6 border-t border-[var(--border-default)]">
              <Text className="text-[var(--text-[var(--text-secondary)])] text-xs text-center m-0">
                Questa email è stata inviata automaticamente da MechMind OS.
              </Text>
              <Text className="text-[var(--text-[var(--text-secondary)])] text-xs text-center m-0 mt-2">
                Per domande sulla fatturazione, contatta il tuo officina.
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

export default InvoiceNotificationEmail;
