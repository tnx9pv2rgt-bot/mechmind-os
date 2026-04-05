'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FileDown, FileText, Printer, Download } from 'lucide-react';

interface ExportMenuProps {
  /** Called to get CSV data. Return an array of objects to serialize. */
  getData?: () => Record<string, string | number>[];
  /** File name prefix for CSV download */
  filePrefix?: string;
  className?: string;
}

function objectsToCsv(data: Record<string, string | number>[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = String(row[h] ?? '');
        return val.includes(',') || val.includes('"')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      })
      .join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

function downloadBlob(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const MENU_ITEMS = [
  { id: 'csv', label: 'Esporta CSV', icon: Download, ariaLabel: 'Esporta dati in formato CSV' },
  { id: 'pdf', label: 'Esporta PDF', icon: FileText, ariaLabel: 'Esporta in formato PDF' },
  { id: 'print', label: 'Stampa', icon: Printer, ariaLabel: 'Stampa la pagina corrente' },
] as const;

type MenuAction = (typeof MENU_ITEMS)[number]['id'];

export function ExportMenu({
  getData,
  filePrefix = 'mechmind-analytics',
  className = '',
}: ExportMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleAction = useCallback(
    (action: MenuAction) => {
      setOpen(false);

      switch (action) {
        case 'csv': {
          const data = getData?.() ?? [];
          if (data.length === 0) return;
          const csv = objectsToCsv(data);
          const timestamp = new Date().toISOString().slice(0, 10);
          downloadBlob(csv, `${filePrefix}-${timestamp}.csv`, 'text/csv;charset=utf-8;');
          break;
        }
        case 'pdf':
        case 'print':
          window.print();
          break;
      }
    },
    [getData, filePrefix],
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors duration-200 hover:bg-[var(--surface-active)] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-tertiary)]"
        aria-label="Menu esportazione"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <FileDown className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Opzioni di esportazione"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: -4 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--surface-elevated)]/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          >
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  onClick={() => handleAction(item.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--surface-active)] hover:text-white focus:outline-none focus-visible:bg-[var(--surface-active)] focus-visible:text-white"
                  aria-label={item.ariaLabel}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
