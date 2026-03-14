import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f4f4f4] dark:bg-[#212121] flex items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-[64px] font-bold text-[#0d0d0d] dark:text-[#ececec] tracking-tight">404</h1>
        <p className="mt-2 text-[15px] text-[#636366]">Pagina non trovata</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-[#0d0d0d] dark:bg-[#ececec] text-white dark:text-[#0d0d0d] h-[44px] px-6 text-[15px] font-medium hover:opacity-90 transition-opacity"
        >
          Torna alla home
        </Link>
      </div>
    </div>
  )
}
