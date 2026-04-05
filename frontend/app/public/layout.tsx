import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MechMind OS',
  description: 'Gestione officina intelligente',
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--surface-tertiary)] dark:bg-[var(--surface-tertiary)] flex flex-col">
      {/* Header */}
      <header className="w-full border-b border-[var(--border-default)] dark:border-[var(--border-strong)] bg-white dark:bg-[var(--surface-primary)]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">MechMind OS</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[var(--border-default)] dark:border-[var(--border-strong)] bg-white dark:bg-[var(--surface-primary)]">
        <div className="max-w-3xl mx-auto px-4 py-4 text-center text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
          Powered by <span className="font-medium text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">MechMind OS</span>
        </div>
      </footer>
    </div>
  );
}
