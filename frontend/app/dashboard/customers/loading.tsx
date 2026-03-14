export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-apple-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-[15px] text-[#636366] dark:text-[#a1a1aa]">Caricamento...</p>
      </div>
    </div>
  )
}
