'use client';

import * as React from 'react';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCommandPaletteStore } from '@/stores/command-palette-store';

/**
 * Global keyboard shortcuts for MechMind OS.
 *
 * Sequential shortcuts (vim-style):
 *   g → c = Go to Customers
 *   g → b = Go to Bookings
 *   g → f = Go to Fatture
 *   g → v = Go to Vehicles
 *   g → w = Go to Work Orders
 *   g → a = Go to Analytics
 *   g → s = Go to Settings
 *   g → d = Go to Dashboard
 *   g → k = Go to Calendar
 *   g → e = Go to Estimates
 *   g → i = Go to Inspections
 *   g → p = Go to Parts
 *   g → m = Go to Marketing
 *
 * Direct shortcuts:
 *   ? = Show keyboard shortcuts help
 *   / = Focus search (if on a page with search)
 */

const GO_SHORTCUTS: Record<string, string> = {
  d: '/dashboard',
  c: '/dashboard/customers',
  b: '/dashboard/bookings',
  v: '/dashboard/vehicles',
  w: '/dashboard/work-orders',
  f: '/dashboard/invoices',
  e: '/dashboard/estimates',
  i: '/dashboard/inspections',
  p: '/dashboard/parts',
  k: '/dashboard/calendar',
  a: '/dashboard/analytics',
  m: '/dashboard/marketing',
  s: '/dashboard/settings',
  r: '/dashboard/rentri',
  o: '/dashboard/obd',
  g: '/dashboard/warranty',
};

export function useKeyboardShortcuts(): void {
  const router = useRouter();
  const { toggle: toggleCommandPalette } = useCommandPaletteStore();
  const pendingKey = useRef<string | null>(null);
  const pendingTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function isInputFocused(): boolean {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || (el as HTMLElement).isContentEditable;
    }

    function handleKeyDown(e: KeyboardEvent): void {
      // Skip if typing in an input
      if (isInputFocused()) return;
      // Skip if modifier keys (except for Cmd+K)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // Handle pending "g" sequence
      if (pendingKey.current === 'g') {
        pendingKey.current = null;
        if (pendingTimeout.current) clearTimeout(pendingTimeout.current);

        const href = GO_SHORTCUTS[key];
        if (href) {
          e.preventDefault();
          router.push(href);
        }
        return;
      }

      // Start "g" sequence
      if (key === 'g') {
        pendingKey.current = 'g';
        pendingTimeout.current = setTimeout(() => {
          pendingKey.current = null;
        }, 500);
        return;
      }

      // Direct shortcuts
      if (key === '/' || key === '?') {
        // "/" focuses search input if available
        if (key === '/') {
          const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
          if (searchInput) {
            e.preventDefault();
            searchInput.focus();
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (pendingTimeout.current) clearTimeout(pendingTimeout.current);
    };
  }, [router, toggleCommandPalette]);
}

/**
 * Hook to use in the dashboard layout.
 * Registers all global keyboard shortcuts.
 */
export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  useKeyboardShortcuts();
  return <>{children}</>;
}
