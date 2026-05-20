'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Search,
  Users,
  Car,
  Wrench,
  FileText,
  Clock,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Types ─── */

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  href: string;
  group: string;
  icon: LucideIcon;
}

interface GroupConfig {
  label: string;
  icon: LucideIcon;
}

const GROUP_CONFIG: Record<string, GroupConfig> = {
  clienti: { label: 'Clienti', icon: Users },
  veicoli: { label: 'Veicoli', icon: Car },
  ordini: { label: 'Ordini di Lavoro', icon: Wrench },
  fatture: { label: 'Fatture', icon: FileText },
};

const RECENT_KEY = 'mechmind-recent-searches';
const MAX_RECENT = 5;

/* ─── Component ─── */

export function CommandPalette(): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  // Load recent searches from localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  // Global keyboard shortcut
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset on open
  React.useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Debounced search
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/dashboard/search?q=${encodeURIComponent(query.trim())}`);
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = await res.json();
        const mapped: SearchResult[] = (data.results ?? []).map((r: Record<string, unknown>) => ({
          id: String(r.id ?? ''),
          title: String(r.title ?? ''),
          subtitle: r.subtitle ? String(r.subtitle) : undefined,
          badge: r.badge ? String(r.badge) : undefined,
          href: String(r.href ?? '#'),
          group: String(r.group ?? 'clienti'),
          icon: GROUP_CONFIG[String(r.group ?? 'clienti')]?.icon ?? Search,
        }));
        setResults(mapped);
        setActiveIndex(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function saveRecentSearch(term: string): void {
    const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  function navigateToResult(result: SearchResult): void {
    saveRecentSearch(query.trim());
    setOpen(false);
    router.push(result.href);
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      navigateToResult(results[activeIndex]);
    }
  }

  // Group results
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, result) => {
    if (!acc[result.group]) acc[result.group] = [];
    acc[result.group].push(result);
    return acc;
  }, {});

  let flatIndex = -1;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[var(--surface-primary)]/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[20%] z-50 w-full max-w-lg translate-x-[-50%] rounded-2xl border border-[var(--border-default)] bg-[var(--surface-secondary)] shadow-apple-lg dark:border-[var(--border-default)] dark:bg-[var(--surface-elevated)]"
          aria-label="Ricerca globale"
        >
          <DialogPrimitive.Title className="sr-only">Ricerca globale</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Cerca tra clienti, veicoli, ordini di lavoro e fatture
          </DialogPrimitive.Description>
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-[var(--border-default)] px-4 dark:border-[var(--border-default)]">
            <Search className="h-5 w-5 text-[var(--text-tertiary)]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Cerca clienti, veicoli, ordini..."
              className="flex-1 bg-transparent py-4 text-body text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] dark:text-[var(--text-primary)] dark:placeholder:text-[var(--text-tertiary)]"
            />
            <kbd className="hidden rounded-md border border-[var(--border-default)] px-2 py-0.5 text-caption text-[var(--text-tertiary)] sm:inline-block dark:border-[var(--border-default)]">
              Esc
            </kbd>
          </div>

          {/* Results area */}
          <div className="max-h-80 overflow-y-auto p-2" role="listbox">
            {/* Recent searches (when no query) */}
            {!query.trim() && recentSearches.length > 0 && (
              <div className="px-2 py-2">
                <p className="mb-2 text-caption font-medium uppercase tracking-wider text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                  Ricerche recenti
                </p>
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-subhead text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-secondary)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--surface-hover)]"
                  >
                    <Clock className="h-4 w-4 text-[var(--text-tertiary)]" />
                    {term}
                  </button>
                ))}
              </div>
            )}

            {/* Loading */}
            {loading && query.trim() && (
              <div className="flex items-center justify-center py-8 text-subhead text-[var(--text-tertiary)]">
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-apple-blue" />
                Ricerca in corso...
              </div>
            )}

            {/* No results */}
            {!loading && query.trim() && results.length === 0 && (
              <div className="py-8 text-center text-subhead text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                Nessun risultato per &ldquo;{query}&rdquo;
              </div>
            )}

            {/* Grouped results */}
            {!loading &&
              Object.entries(grouped).map(([groupKey, items]) => {
                const config = GROUP_CONFIG[groupKey];
                return (
                  <div key={groupKey} className="mb-2">
                    <p className="mb-1 px-3 text-caption font-medium uppercase tracking-wider text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                      {config?.label ?? groupKey}
                    </p>
                    {items.map((result) => {
                      flatIndex++;
                      const isActive = flatIndex === activeIndex;
                      const Icon = result.icon;
                      const currentIndex = flatIndex;
                      return (
                        <button
                          key={result.id}
                          role="option"
                          aria-selected={isActive}
                          onClick={() => navigateToResult(result)}
                          onMouseEnter={() => setActiveIndex(currentIndex)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                            isActive
                              ? 'bg-[var(--brand)]/10 text-[var(--brand)] dark:bg-[var(--brand)]/20'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--surface-hover)]'
                          )}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-subhead font-medium">{result.title}</p>
                            {result.subtitle && (
                              <p className="truncate text-caption text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                                {result.subtitle}
                              </p>
                            )}
                          </div>
                          {result.badge && (
                            <span className="flex-shrink-0 rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-caption text-[var(--text-tertiary)] dark:bg-[var(--surface-primary)] dark:text-[var(--text-secondary)]">
                              {result.badge}
                            </span>
                          )}
                          <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]" />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[var(--border-default)] px-4 py-2 text-caption text-[var(--text-tertiary)] dark:border-[var(--border-default)] dark:text-[var(--text-secondary)]">
            <span>
              <kbd className="rounded border border-[var(--border-default)] px-1.5 py-0.5 dark:border-[var(--border-default)]">↑↓</kbd>{' '}
              Naviga{' '}
              <kbd className="rounded border border-[var(--border-default)] px-1.5 py-0.5 dark:border-[var(--border-default)]">↵</kbd>{' '}
              Seleziona
            </span>
            <span>
              <kbd className="rounded border border-[var(--border-default)] px-1.5 py-0.5 dark:border-[var(--border-default)]">⌘K</kbd>{' '}
              Apri/Chiudi
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
