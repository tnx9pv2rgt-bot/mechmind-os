'use client';
import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav
      aria-label='Breadcrumb'
      className='flex items-center gap-2 text-sm text-[var(--text-tertiary)] mb-4'
    >
      {items.map((item, i) => (
        <span key={i} className='flex items-center gap-2'>
          {i > 0 && <span className='text-[var(--text-tertiary)]'>/</span>}
          {item.href ? (
            <Link
              href={item.href}
              className='hover:text-[var(--text-secondary)] transition-colors'
            >
              {item.label}
            </Link>
          ) : (
            <span className='text-[var(--text-primary)] font-medium'>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
