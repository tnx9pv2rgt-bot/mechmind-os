import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f4f4] px-6 dark:bg-[#212121]">
      <div className="text-center">
        {/* Big 404 */}
        <p className="text-[120px] font-bold leading-none tracking-tighter text-gray-200 sm:text-[180px] dark:text-gray-800">
          404
        </p>

        <h1 className="mt-2 text-title-2 font-semibold text-gray-900 dark:text-gray-100">
          Pagina non trovata
        </h1>
        <p className="mt-2 max-w-md text-body text-gray-500 dark:text-gray-400">
          La pagina che stai cercando non esiste o è stata spostata.
        </p>

        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-apple-blue px-6 py-3 text-subhead font-medium text-white transition-all hover:bg-apple-blue-hover hover:shadow-apple active:scale-[0.98]"
        >
          <Home className="h-4 w-4" />
          Torna alla Dashboard
        </Link>
      </div>
    </div>
  );
}
