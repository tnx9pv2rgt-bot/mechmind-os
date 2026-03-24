'use client';

import Script from 'next/script';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Google Analytics 4 con Consent Mode v2.
 *
 * 1. Imposta i default di consenso a "denied" inline (no preload)
 * 2. Carica gtag.js con lazyOnload per evitare preload warning
 * 3. Configura la proprietà GA4
 *
 * Il CookieConsent component si occupa di chiamare gtag('consent', 'update', ...)
 * quando l'utente accetta o rifiuta i cookie analitici.
 */
export function GoogleAnalytics(): React.ReactElement | null {
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      {/* 1 — Consent defaults + gtag init (inline, no external preload) */}
      <Script
        id="gtag-consent-default"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              analytics_storage: 'denied',
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              wait_for_update: 500
            });
          `,
        }}
      />

      {/* 2 — Load gtag.js (lazyOnload avoids preload-not-used warning) */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="lazyOnload"
      />

      {/* 3 — Configure GA4 */}
      <Script
        id="gtag-init"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              send_page_view: true
            });
          `,
        }}
      />
    </>
  );
}
