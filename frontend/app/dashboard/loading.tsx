export default function DashboardLoading() {
  return (
    <div className='flex flex-col gap-6 p-6 animate-pulse'>
      <div className='h-8 w-48 rounded bg-[var(--surface-2)]' />
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className='h-32 rounded-lg bg-[var(--surface-2)]' />
        ))}
      </div>
      <div className='h-64 rounded-lg bg-[var(--surface-2)]' />
    </div>
  );
}
