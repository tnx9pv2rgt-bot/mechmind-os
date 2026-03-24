import { Suspense } from 'react'
import { MFAVerifyPageClient } from './client'

export const metadata = {
  title: 'Verifica 2FA - MechMind OS',
  description: 'Inserisci il codice di verifica a due fattori',
}

export default function MFAVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] text-white">Caricamento...</div>}>
      <MFAVerifyPageClient />
    </Suspense>
  )
}
