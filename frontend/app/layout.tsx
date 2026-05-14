import type { Metadata, Viewport } from 'next';
import {
  Inter,
  Plus_Jakarta_Sans,
  DM_Sans,
  Nunito,
  Poppins,
  Roboto,
  Lato,
  Open_Sans,
  Montserrat,
} from 'next/font/google';
import { headers } from 'next/headers';
import '../styles/globals.css';
import { Providers } from '@/components/providers';
import { StyledJsxRegistry } from '@/lib/styled-jsx-registry';
import { DynamicToaster } from '@/components/layout/dynamic-toaster';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { CookieConsentLoader } from '@/components/gdpr/CookieConsentLoader';

// Font optimization — adjustFontFallback generates size-adjust for zero CLS
// preload: false avoids loading the font on pages that don't use it (e.g. auth)
// Next.js still injects the font when the CSS variable is referenced
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: false,
  adjustFontFallback: true,
});

// Theme font options — all lazy-loaded via CSS variables
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plus-jakarta',
  preload: false,
});
const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
  preload: false,
});
const nunito = Nunito({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-nunito',
  preload: false,
});
const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
  weight: ['300', '400', '500', '600', '700'],
  preload: false,
});
const roboto = Roboto({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
  weight: ['300', '400', '500', '700'],
  preload: false,
});
const lato = Lato({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lato',
  weight: ['300', '400', '700'],
  preload: false,
});
const openSans = Open_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-open-sans',
  preload: false,
});
const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
  preload: false,
});

// Metadata for SEO and performance
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://mechmind.it'),
  title: 'MechMind OS v10 - Gestione Officina Automotive',
  description:
    'Piattaforma completa per la gestione di officine meccaniche e flotte. Multi-sede, CRM, analitiche in tempo reale e integrazioni enterprise. FatturaPA, RENTRI e SDI inclusi.',
  keywords: [
    'gestione officina',
    'automotive',
    'officina meccanica',
    'CRM officina',
    'prenotazioni',
    'fatturazione elettronica',
    'FatturaPA',
  ],
  authors: [{ name: 'MechMind' }],
  creator: 'MechMind OS',
  publisher: 'MechMind',
  robots: 'index, follow',

  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    url: 'https://mechmind.it',
    siteName: 'MechMind OS',
    title: 'MechMind OS v10 - Gestione Officina Automotive',
    description:
      'Piattaforma completa per officine meccaniche italiane. FatturaPA, RENTRI, prenotazioni e CRM.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'MechMind OS Dashboard',
      },
    ],
  },

  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: 'MechMind OS v10',
    description: 'Gestione officina automotive — FatturaPA, RENTRI, CRM, prenotazioni.',
    images: ['/twitter-image.jpg'],
  },

  // Icons
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/favicon.svg',
  },

  // Manifest
  manifest: '/manifest.json',

  // Other
  other: {
    'mobile-web-app-capable': 'yes',
    'cache-control': 'public, max-age=0, must-revalidate',
  },
};

// Viewport configuration — dark mode only
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  minimumScale: 1,
  userScalable: true,
  themeColor: '#212121',
  colorScheme: 'dark',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html
      lang='it'
      className={`${inter.variable} ${plusJakarta.variable} ${dmSans.variable} ${nunito.variable} ${poppins.variable} ${roboto.variable} ${lato.variable} ${openSans.variable} ${montserrat.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* DNS prefetch for APIs — no preconnect to Google Fonts (next/font self-hosts) */}
        <link rel='dns-prefetch' href='https://api.mechmind.it' />
        <link rel='dns-prefetch' href='https://supabase.co' />
        <GoogleAnalytics nonce={nonce} />
      </head>
      <body className={`${inter.className} antialiased transition-colors`}>
        <StyledJsxRegistry>
          <Providers nonce={nonce}>{children}</Providers>
          <DynamicToaster />
          <CookieConsentLoader />
        </StyledJsxRegistry>
      </body>
    </html>
  );
}
