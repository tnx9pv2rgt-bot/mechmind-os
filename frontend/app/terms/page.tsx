import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Condizioni d\'Uso | MechMind OS',
  description: 'Condizioni generali di utilizzo della piattaforma MechMind OS per la gestione delle officine automotive. Termini e regolamenti del servizio.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f4f4f4] dark:bg-[#212121] px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-[28px] font-bold text-[#0d0d0d] dark:text-[#ececec] tracking-tight">
          Condizioni d&apos;uso
        </h1>
        <p className="mt-4 text-[15px] text-[#636366] leading-relaxed">
          Le condizioni d&apos;uso di MechMind OS saranno disponibili a breve.
        </p>
        <Link
          href="/auth"
          className="mt-8 inline-flex items-center text-[14px] font-medium text-[#0d0d0d] dark:text-[#ececec] hover:opacity-70 transition-opacity"
        >
          &larr; Torna al login
        </Link>
      </div>
    </div>
  )
}
