import { Suspense } from 'react'
import { MFAVerifyPageClient } from './client'

export const metadata = {
  title: 'Verifica 2FA - MechMind OS',
  description: 'Inserisci il codice di verifica a due fattori',
}

export default function MFAVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center dark:bg-[#212121] dark:text-[#ececec]">Caricamento...</div>}>
      <MFAVerifyPageClient />
    </Suspense>
  )
}
