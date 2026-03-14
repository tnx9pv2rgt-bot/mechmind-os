import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MechMind OS | Gestionale Automotive Professionale',
  description: 'Piattaforma completa per la gestione della tua officina automotive. Appuntamenti, clienti, fatture, ispezioni e molto altro in un unico sistema.',
}

export default function HomePage() {
  redirect('/auth')
}
