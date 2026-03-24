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
      className='flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4'
    >
      {items.map((item, i) => (
        <span key={i} className='flex items-center gap-2'>
          {i > 0 && <span className='text-gray-300 dark:text-gray-600'>/</span>}
          {item.href ? (
            <Link
              href={item.href}
              className='hover:text-gray-700 dark:hover:text-gray-300 transition-colors'
            >
              {item.label}
            </Link>
          ) : (
            <span className='text-gray-900 dark:text-white font-medium'>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
