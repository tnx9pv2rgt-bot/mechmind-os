export default function PortalLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[15px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Caricamento...</p>
      </div>
    </div>
  )
}
