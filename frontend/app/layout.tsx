import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import dynamic from 'next/dynamic';
import '../styles/globals.css';
import { Providers } from '@/components/providers';
import { StyledJsxRegistry } from '@/lib/styled-jsx-registry';
import { Toaster } from 'sonner';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';

const CookieConsent = dynamic(
  () => import('@/components/gdpr/CookieConsent').then(mod => mod.CookieConsent),
  { ssr: false }
);

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

// Metadata for SEO and performance
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://mechmind.com'),
  title: 'MechMind OS v10 - Enterprise Automotive Management',
  description:
    'Complete workshop management platform for automotive repair shops. Multi-location, CRM, real-time analytics, and enterprise integrations.',
  keywords: ['automotive', 'workshop', 'management', 'CRM', 'booking', 'invoicing'],
  authors: [{ name: 'MechMind' }],
  creator: 'MechMind OS',
  publisher: 'MechMind',
  robots: 'index, follow',

  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    url: 'https://mechmind.com',
    siteName: 'MechMind OS',
    title: 'MechMind OS v10 - Enterprise Automotive Management',
    description: 'Complete workshop management platform for automotive repair shops.',
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
    description: 'Enterprise Automotive Management Platform',
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

// Viewport configuration
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  minimumScale: 1,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f4f4' },
    { media: '(prefers-color-scheme: dark)', color: '#212121' },
  ],
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='it' className={inter.variable} suppressHydrationWarning>
      <head>
        {/* DNS prefetch for APIs — no preconnect to Google Fonts (next/font self-hosts) */}
        <link rel='dns-prefetch' href='https://api.mechmind.com' />
        <link rel='dns-prefetch' href='https://supabase.co' />
        <GoogleAnalytics />
      </head>
      <body
        className={`${inter.className} antialiased bg-[#f4f4f4] dark:bg-[#212121] transition-colors`}
      >
        <StyledJsxRegistry>
          <Providers>{children}</Providers>
          <Toaster richColors position='top-right' />
          <CookieConsent />
        </StyledJsxRegistry>
      </body>
    </html>
  );
}
