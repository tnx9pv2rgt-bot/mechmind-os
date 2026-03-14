import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Informativa sulla Privacy | MechMind OS',
  description: 'Informativa sulla privacy di MechMind OS. Scopri come proteggiamo i tuoi dati personali e garantiamo la conformità al GDPR.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f4f4f4] dark:bg-[#212121] px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-[28px] font-bold text-[#0d0d0d] dark:text-[#ececec] tracking-tight">
          Informativa sulla privacy
        </h1>
        <p className="mt-4 text-[15px] text-[#636366] leading-relaxed">
          L&apos;informativa sulla privacy di MechMind OS sar&agrave; disponibile a breve.
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
