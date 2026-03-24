import type { Metadata } from 'next';
import { LandingPage } from './landing-page';

export const metadata: Metadata = {
  title: 'MechMind OS — Il Gestionale per Officine Meccaniche',
  description:
    'Gestionale cloud per officine meccaniche italiane. Ordini di lavoro, fatturazione elettronica SDI, prenotazioni online. Prova gratis 14 giorni.',
  keywords: [
    'gestionale officina',
    'software officina meccanica',
    'fatturazione elettronica officina',
    'gestione ordini di lavoro',
    'prenotazione online officina',
    'ispezioni digitali auto',
    'CRM automotive',
    'MechMind',
  ],
  openGraph: {
    title: 'MechMind OS — Gestisci la tua officina in modo semplice',
    description:
      'Ordini di lavoro, fatture SDI, prenotazioni, portale cliente. Tutto in italiano. Prova gratis.',
    type: 'website',
    locale: 'it_IT',
    images: [
      {
        url: '/og-landing.jpg',
        width: 1200,
        height: 630,
        alt: 'MechMind OS Dashboard',
      },
    ],
  },
  alternates: {
    canonical: 'https://mechmind.it',
  },
};

export default function HomePage(): React.ReactElement {
  return (
    <>
      {/* Schema.org SoftwareApplication */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'MechMind OS',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            offers: {
              '@type': 'Offer',
              price: '29.00',
              priceCurrency: 'EUR',
              priceValidUntil: '2027-01-01',
            },
          }),
        }}
      />
      <LandingPage />
    </>
  );
}
