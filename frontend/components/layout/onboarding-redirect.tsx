'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * OnboardingRedirect: Reindirizza automaticamente gli utenti non onboarded
 * a /onboarding, ma solo una volta durante il ciclo di vita della pagina.
 *
 * Condizioni per il redirect:
 * 1. L'utente NON è già su /onboarding (per evitare loop)
 * 2. mechmind_onboarding_answers NON esiste in localStorage (non completato)
 * 3. mechmind_onboarding_dismissed NON esiste in localStorage (non skippato)
 */
export function OnboardingRedirect(): null {
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Evita redirect multipli
    if (hasRedirected.current) return;

    // Non redirige se già su /onboarding
    if (pathname.startsWith('/onboarding')) return;

    // Controlla localStorage
    const onboardingAnswers = localStorage.getItem('mechmind_onboarding_answers');
    const onboardingDismissed = localStorage.getItem('mechmind_onboarding_dismissed');

    // Se non ha completato l'onboarding e non l'ha dismissato, redirige
    if (!onboardingAnswers && !onboardingDismissed) {
      hasRedirected.current = true;
      router.replace('/onboarding');
    }
  }, [pathname, router]);

  return null;
}
