import { MFASetupPageClient } from './client'

export const metadata = {
  title: 'Configura 2FA - MechMind OS',
  description: 'Configura l\'autenticazione a due fattori per il tuo account',
}

export default function MFASetupPage() {
  return <MFASetupPageClient />
}
