'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  ChevronDown,
  Check,
  Plus,
  Settings,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────
interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: 'owner' | 'admin' | 'member';
  logo?: string;
  stats?: {
    activeBookings: number;
    pendingInvoices: number;
  };
}

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  currentWorkspaceId: string;
  onSwitch: (workspaceId: string) => void;
  onCreateNew?: () => void;
  onSettings?: () => void;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────
export function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
  onSwitch,
  onCreateNew,
  onSettings,
  className,
}: WorkspaceSwitcherProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const current = workspaces.find((w) => w.id === currentWorkspaceId);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSwitch = (id: string): void => {
    if (id !== currentWorkspaceId) {
      onSwitch(id);
    }
    setIsOpen(false);
  };

  const roleLabels: Record<Workspace['role'], string> = {
    owner: 'Proprietario',
    admin: 'Amministratore',
    member: 'Membro',
  };

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors w-full text-left"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Cambia sede"
      >
        {/* Workspace Avatar */}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
          {current?.logo ? (
            <img src={current.logo} alt="" className="w-full h-full rounded-lg object-cover" />
          ) : (
            <span className="text-white text-xs font-bold">
              {current?.name?.charAt(0)?.toUpperCase() ?? 'M'}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">
            {current?.name ?? 'MechMind'}
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)] truncate">
            {current ? roleLabels[current.role] : ''}
          </p>
        </div>

        <ChevronDown className={cn(
          'h-4 w-4 text-[var(--text-tertiary)] shrink-0 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-[var(--surface-primary)] rounded-xl border border-[var(--border-default)] dark:border-[var(--border-default)] shadow-xl overflow-hidden min-w-[240px]"
            role="listbox"
          >
            {/* Workspaces */}
            <div className="py-1">
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Le tue sedi
              </p>
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => handleSwitch(workspace.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white dark:hover:bg-[var(--surface-hover)] transition-colors',
                    workspace.id === currentWorkspaceId && 'bg-[var(--brand)]/5/50 dark:bg-[var(--brand)]/10/20'
                  )}
                  role="option"
                  aria-selected={workspace.id === currentWorkspaceId}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
                    {workspace.logo ? (
                      <img src={workspace.logo} alt="" className="w-full h-full rounded-lg object-cover" />
                    ) : (
                      <span className="text-white text-xs font-bold">
                        {workspace.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] truncate">
                      {workspace.name}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
                      {roleLabels[workspace.role]}
                      {workspace.stats && (
                        <> &middot; {workspace.stats.activeBookings} prenotazioni</>
                      )}
                    </p>
                  </div>

                  {workspace.id === currentWorkspaceId && (
                    <Check className="h-4 w-4 text-[var(--brand)] dark:text-[var(--brand)] shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="border-t border-[var(--border-default)] dark:border-[var(--border-default)] py-1">
              {workspaces.length > 1 && (
                <button
                  onClick={() => { setIsOpen(false); /* navigate to multi-location analytics */ }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] hover:bg-white dark:hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <BarChart3 className="h-4 w-4 text-[var(--text-tertiary)]" />
                  Vista aggregata
                </button>
              )}
              {onSettings && (
                <button
                  onClick={() => { setIsOpen(false); onSettings(); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] hover:bg-white dark:hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <Settings className="h-4 w-4 text-[var(--text-tertiary)]" />
                  Gestisci sedi
                </button>
              )}
              {onCreateNew && (
                <button
                  onClick={() => { setIsOpen(false); onCreateNew(); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--brand)] dark:text-[var(--brand)] hover:bg-[var(--brand)]/5 dark:hover:bg-blue-950/20 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Aggiungi sede
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
