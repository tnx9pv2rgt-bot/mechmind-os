'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  customers: 'Clienti',
  vehicles: 'Veicoli',
  'work-orders': 'Ordini di Lavoro',
  invoices: 'Fatture',
  bookings: 'Prenotazioni',
  estimates: 'Preventivi',
  inspections: 'Ispezioni',
  parts: 'Ricambi',
  locations: 'Sedi',
  maintenance: 'Manutenzione',
  'canned-jobs': 'Lavori Standard',
  warranty: 'Garanzie',
  marketing: 'Campagne',
  messaging: 'Messaggistica',
  obd: 'OBD Diagnostica',
  analytics: 'Analytics',
  subscription: 'Abbonamento',
  settings: 'Impostazioni',
  calendar: 'Calendario',
  new: 'Nuovo',
  edit: 'Modifica',
  claims: 'Reclami',
};

function isUuid(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
}

function isNumericId(segment: string): boolean {
  return /^\d+$/.test(segment);
}

function getLabelForSegment(segment: string): string {
  if (ROUTE_LABELS[segment]) return ROUTE_LABELS[segment];
  if (isUuid(segment) || isNumericId(segment)) return 'Dettaglio';
  // Fallback: capitalize and replace hyphens
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface BreadcrumbItem {
  label: string;
  href: string;
}

export function Breadcrumb(): React.ReactElement | null {
  const pathname = usePathname();

  // Don't render on dashboard root
  if (pathname === '/dashboard') return null;

  const segments = pathname.split('/').filter(Boolean);

  // Build breadcrumb items
  const items: BreadcrumbItem[] = [];
  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    currentPath += `/${segments[i]}`;
    const label = getLabelForSegment(segments[i]);

    // Skip "dashboard" as a breadcrumb item, but keep the path
    if (segments[i] === 'dashboard' && i === 0) {
      items.push({ label: 'Dashboard', href: '/dashboard' });
      continue;
    }

    items.push({ label, href: currentPath });
  }

  if (items.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.href} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-[var(--text-tertiary)] shrink-0" aria-hidden="true" />
              )}

              {isLast ? (
                <span
                  className="font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] truncate max-w-[200px]"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)] transition-colors truncate max-w-[160px]',
                    index === 0 && 'flex items-center gap-1'
                  )}
                >
                  {index === 0 && <Home className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                  <span>{item.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
