'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  LayoutDashboard,
  Users,
  Car,
  CalendarCheck,
  Calendar,
  Wrench,
  Receipt,
  FileText,
  ClipboardCheck,
  Package,
  Megaphone,
  MessageSquare,
  Shield,
  Activity,
  BarChart3,
  MapPin,
  Settings,
  Plus,
  Search,
  Recycle,
  CreditCard,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';
import { useCommandPaletteStore } from '@/stores/command-palette-store';

// ─── Navigation Items ───────────────────────────────────────────────
interface CommandItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  keywords?: string[];
  group: 'navigation' | 'actions' | 'search';
}

const NAVIGATION_ITEMS: CommandItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', group: 'navigation', keywords: ['home', 'principale'] },
  { id: 'customers', label: 'Clienti', icon: Users, href: '/dashboard/customers', group: 'navigation', keywords: ['clienti', 'anagrafica', 'rubrica'] },
  { id: 'vehicles', label: 'Veicoli', icon: Car, href: '/dashboard/vehicles', group: 'navigation', keywords: ['auto', 'macchine', 'targhe'] },
  { id: 'bookings', label: 'Prenotazioni', icon: CalendarCheck, href: '/dashboard/bookings', group: 'navigation', keywords: ['appuntamenti', 'agenda'] },
  { id: 'calendar', label: 'Calendario', icon: Calendar, href: '/dashboard/calendar', group: 'navigation', keywords: ['agenda', 'pianificazione'] },
  { id: 'work-orders', label: 'Ordini di Lavoro', icon: Wrench, href: '/dashboard/work-orders', group: 'navigation', keywords: ['lavori', 'riparazioni', 'officina'] },
  { id: 'invoices', label: 'Fatture', icon: Receipt, href: '/dashboard/invoices', group: 'navigation', keywords: ['fatturazione', 'pagamenti', 'contabilita'] },
  { id: 'estimates', label: 'Preventivi', icon: FileText, href: '/dashboard/estimates', group: 'navigation', keywords: ['quotazioni', 'offerte'] },
  { id: 'inspections', label: 'Ispezioni', icon: ClipboardCheck, href: '/dashboard/inspections', group: 'navigation', keywords: ['controlli', 'check', 'revisioni'] },
  { id: 'parts', label: 'Ricambi', icon: Package, href: '/dashboard/parts', group: 'navigation', keywords: ['magazzino', 'inventario', 'stock'] },
  { id: 'marketing', label: 'Marketing', icon: Megaphone, href: '/dashboard/marketing', group: 'navigation', keywords: ['campagne', 'email', 'sms'] },
  { id: 'messaging', label: 'Messaggistica', icon: MessageSquare, href: '/dashboard/messaging', group: 'navigation', keywords: ['sms', 'chat', 'comunicazioni'] },
  { id: 'warranty', label: 'Garanzie', icon: Shield, href: '/dashboard/warranty', group: 'navigation', keywords: ['coperture', 'reclami'] },
  { id: 'obd', label: 'OBD Diagnostica', icon: Activity, href: '/dashboard/obd', group: 'navigation', keywords: ['telemetria', 'diagnostica', 'sensori'] },
  { id: 'rentri', label: 'Rifiuti (RENTRI)', icon: Recycle, href: '/dashboard/rentri', group: 'navigation', keywords: ['smaltimento', 'cer', 'fir'] },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/dashboard/analytics', group: 'navigation', keywords: ['statistiche', 'report', 'grafici'] },
  { id: 'locations', label: 'Sedi', icon: MapPin, href: '/dashboard/locations', group: 'navigation', keywords: ['officine', 'filiali'] },
  { id: 'canned-jobs', label: 'Lavori Standard', icon: BookOpen, href: '/dashboard/canned-jobs', group: 'navigation', keywords: ['template', 'predefiniti'] },
  { id: 'subscription', label: 'Abbonamento', icon: CreditCard, href: '/dashboard/subscription', group: 'navigation', keywords: ['piano', 'billing'] },
  { id: 'settings', label: 'Impostazioni', icon: Settings, href: '/dashboard/settings', group: 'navigation', keywords: ['configurazione', 'profilo'] },
];

const ACTION_ITEMS: CommandItem[] = [
  { id: 'new-customer', label: 'Nuovo Cliente', icon: Plus, href: '/dashboard/customers/new', group: 'actions', keywords: ['crea', 'aggiungi'] },
  { id: 'new-booking', label: 'Nuova Prenotazione', icon: Plus, href: '/dashboard/bookings/new', group: 'actions', keywords: ['crea', 'prenota'] },
  { id: 'new-work-order', label: 'Nuovo Ordine di Lavoro', icon: Plus, href: '/dashboard/work-orders/new', group: 'actions', keywords: ['crea', 'lavoro'] },
  { id: 'new-invoice', label: 'Nuova Fattura', icon: Plus, href: '/dashboard/invoices/new', group: 'actions', keywords: ['crea', 'fattura'] },
  { id: 'new-estimate', label: 'Nuovo Preventivo', icon: Plus, href: '/dashboard/estimates/new', group: 'actions', keywords: ['crea', 'preventivo'] },
  { id: 'new-vehicle', label: 'Nuovo Veicolo', icon: Plus, href: '/dashboard/vehicles/new', group: 'actions', keywords: ['crea', 'auto'] },
  { id: 'new-inspection', label: 'Nuova Ispezione', icon: Plus, href: '/dashboard/inspections/new', group: 'actions', keywords: ['crea', 'controllo'] },
  { id: 'new-part', label: 'Nuovo Ricambio', icon: Plus, href: '/dashboard/parts/new', group: 'actions', keywords: ['crea', 'pezzo'] },
];

// ─── Component ──────────────────────────────────────────────────────
export function CommandPalette(): React.ReactElement {
  const router = useRouter();
  const { open, toggle, close } = useCommandPaletteStore();
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Global shortcut: Cmd+K / Ctrl+K + single-key shortcuts
  useEffect(() => {
    function isInputFocused(): boolean {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || (el as HTMLElement).isContentEditable;
    }

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
        return;
      }

      // Single-key shortcuts (only when no input is focused and palette is closed)
      if (e.metaKey || e.ctrlKey || e.altKey || isInputFocused() || open) return;

      switch (e.key) {
        case 'n':
        case 'N':
          e.preventDefault();
          router.push('/dashboard/work-orders/new');
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          router.push('/dashboard/customers/new');
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          router.push('/dashboard/invoices/new');
          break;
        case '/':
          e.preventDefault();
          toggle();
          break;
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggle, open, router]);

  const handleSelect = useCallback((href: string): void => {
    close();
    setSearch('');
    router.push(href);
  }, [close, router]);

  if (!open) return <></>;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-[20vh]">
        <Command
          className="w-full max-w-lg bg-white dark:bg-[var(--surface-primary)] rounded-2xl shadow-2xl border border-[var(--border-default)] dark:border-[var(--border-default)] overflow-hidden"
          shouldFilter
          loop
        >
          {/* Search Input */}
          <div className="flex items-center gap-2 px-4 border-b border-[var(--border-default)] dark:border-[var(--border-default)]">
            <Search className="h-4 w-4 text-[var(--text-tertiary)] shrink-0" />
            <Command.Input
              ref={inputRef}
              value={search}
              onValueChange={setSearch}
              placeholder="Cerca pagine, azioni..."
              className="w-full py-3.5 text-sm bg-transparent text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-tertiary)] bg-[var(--surface-hover)] dark:bg-[var(--surface-elevated)] rounded">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-[320px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-[var(--text-secondary)]">
              Nessun risultato trovato.
            </Command.Empty>

            {/* Navigation */}
            <Command.Group heading="Navigazione" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-[var(--text-tertiary)] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
              {NAVIGATION_ITEMS.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.label} ${item.keywords?.join(' ') ?? ''}`}
                  onSelect={() => handleSelect(item.href)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] cursor-pointer data-[selected=true]:bg-[var(--brand)]/5 dark:data-[selected=true]:bg-blue-950/30 data-[selected=true]:text-[var(--brand)] dark:data-[selected=true]:text-[var(--brand)] transition-colors"
                >
                  <item.icon className="h-4 w-4 shrink-0 opacity-60" />
                  <span>{item.label}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Actions */}
            <Command.Group heading="Azioni Rapide" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-[var(--text-tertiary)] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
              {ACTION_ITEMS.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.label} ${item.keywords?.join(' ') ?? ''}`}
                  onSelect={() => handleSelect(item.href)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] cursor-pointer data-[selected=true]:bg-[var(--brand)]/5 dark:data-[selected=true]:bg-blue-950/30 data-[selected=true]:text-[var(--brand)] dark:data-[selected=true]:text-[var(--brand)] transition-colors"
                >
                  <item.icon className="h-4 w-4 shrink-0 text-green-500" />
                  <span>{item.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border-default)] bg-[var(--surface-hover)] dark:bg-[var(--surface-active)]">
            <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-[var(--surface-hover)] text-[10px] font-medium">↑↓</kbd>
                naviga
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-[var(--surface-hover)] text-[10px] font-medium">↵</kbd>
                seleziona
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-[var(--surface-hover)] text-[10px] font-medium">esc</kbd>
                chiudi
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
              <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-[var(--surface-hover)] text-[10px] font-medium">N</kbd>
              <span>OdL</span>
              <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-[var(--surface-hover)] text-[10px] font-medium">C</kbd>
              <span>Cliente</span>
              <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-[var(--surface-hover)] text-[10px] font-medium">F</kbd>
              <span>Fattura</span>
              <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-[var(--surface-hover)] text-[10px] font-medium">/</kbd>
              <span>Cerca</span>
            </div>
          </div>
        </Command>
      </div>
    </>
  );
}
