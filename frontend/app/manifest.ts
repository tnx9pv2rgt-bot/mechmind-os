import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MechMind OS — Gestionale Officina',
    short_name: 'MechMind',
    description: 'Gestionale professionale per officine meccaniche. Multi-sede, CRM, fatturazione, analytics.',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f4f4f4',
    theme_color: '#0071e3',
    categories: ['business', 'productivity'],
    lang: 'it',
    dir: 'ltr',
    icons: [
      {
        src: '/icons/icon-72x72.png',
        sizes: '72x72',
        type: 'image/png',
      },
      {
        src: '/icons/icon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
      },
      {
        src: '/icons/icon-128x128.png',
        sizes: '128x128',
        type: 'image/png',
      },
      {
        src: '/icons/icon-144x144.png',
        sizes: '144x144',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-152x152.png',
        sizes: '152x152',
        type: 'image/png',
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/dashboard.png',
        sizes: '1280x720',
        type: 'image/png',
      },
      {
        src: '/screenshots/mobile.png',
        sizes: '390x844',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'Nuova Prenotazione',
        short_name: 'Prenota',
        url: '/dashboard/bookings/new',
        icons: [{ src: '/icons/shortcut-booking.png', sizes: '96x96' }],
      },
      {
        name: 'Clienti',
        short_name: 'Clienti',
        url: '/dashboard/customers',
        icons: [{ src: '/icons/shortcut-customers.png', sizes: '96x96' }],
      },
      {
        name: 'Fatture',
        short_name: 'Fatture',
        url: '/dashboard/invoices',
        icons: [{ src: '/icons/shortcut-invoices.png', sizes: '96x96' }],
      },
    ],
  };
}
