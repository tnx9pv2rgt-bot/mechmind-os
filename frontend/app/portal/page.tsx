import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Portale Clienti | MechMind OS',
  description: 'Accedi al portale clienti MechMind OS. Visualizza lo stato delle riparazioni, prenota appuntamenti e gestisci i tuoi veicoli online.',
}

/**
 * Portal Root Page
 * Redirects to dashboard or login based on auth status
 */
export default function PortalPage() {
  // This will be handled by the layout middleware
  // But we redirect to login as default
  redirect('/portal/login')
}
