'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const CookieConsentDynamic = dynamic(
  () => import('@/components/gdpr/CookieConsent').then(mod => mod.CookieConsent),
  { ssr: false }
);

/**
 * Cookie banner si mostra SOLO su pagine pubbliche (homepage, /auth/*, /privacy, ecc.).
 * Su /dashboard/* l'utente è autenticato B2B e ha già accettato i termini al login,
 * quindi il banner è soppresso per evitare interruzione del workflow operativo (GDPR
 * art. 6 lett. b — esecuzione del contratto, non serve consenso cookie tecnici).
 */
export function CookieConsentLoader(): React.ReactElement | null {
  const pathname = usePathname();
  // Soppressione sezioni autenticate
  if (
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/api') ||
    pathname?.startsWith('/admin')
  ) {
    return null;
  }
  return <CookieConsentDynamic />;
}
