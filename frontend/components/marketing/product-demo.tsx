'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import Link from 'next/link';

const tabs = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    content: {
      title: 'Dashboard',
      description: 'KPI in tempo reale, fatturato, OdL attivi, prenotazioni.',
      elements: [
        { type: 'kpi-row' as const },
        { type: 'chart' as const },
        { type: 'list' as const },
      ],
    },
  },
  {
    id: 'ordini',
    label: 'Ordini',
    content: {
      title: 'Ordini di Lavoro',
      description: 'Gestisci ogni riparazione dal check-in alla consegna.',
      elements: [
        { type: 'table' as const },
        { type: 'status-bar' as const },
        { type: 'list' as const },
      ],
    },
  },
  {
    id: 'fatture',
    label: 'Fatture',
    content: {
      title: 'Fatturazione SDI',
      description: 'Fatture elettroniche, note di credito, pagamenti.',
      elements: [
        { type: 'kpi-row' as const },
        { type: 'table' as const },
        { type: 'status-bar' as const },
      ],
    },
  },
  {
    id: 'calendario',
    label: 'Calendario',
    content: {
      title: 'Calendario',
      description: 'Prenotazioni, disponibilità, promemoria automatici.',
      elements: [
        { type: 'calendar' as const },
        { type: 'list' as const },
      ],
    },
  },
] as const;

const AUTO_ROTATE_MS = 5000;

function TabContent({ tabId }: { tabId: string }): React.ReactElement {
  const tab = tabs.find((t) => t.id === tabId) ?? tabs[0];

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-[#0d0d0d] dark:text-[#ececec]">{tab.content.title}</h4>
          <p className="mt-0.5 text-xs text-[#8e8ea0]">{tab.content.description}</p>
        </div>
        <div className="flex gap-1.5">
          <div className="h-7 w-16 rounded-md bg-[#0d0d0d]/5 dark:bg-white/10" />
          <div className="h-7 w-7 rounded-md bg-[#f7f7f8] dark:bg-[#2f2f2f]" />
        </div>
      </div>

      {tab.content.elements.map((el, i) => (
        <div key={i} className="mt-4">
          {el.type === 'kpi-row' && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="rounded-lg bg-[#f7f7f8] p-3 dark:bg-[#171717]">
                  <div className="h-2 w-12 rounded bg-[#e5e5e5] dark:bg-[#444654]" />
                  <div className="mt-2 h-4 w-16 rounded bg-[#d9d9e3] dark:bg-[#444654]" />
                </div>
              ))}
            </div>
          )}
          {el.type === 'chart' && (
            <div className="rounded-lg bg-[#f7f7f8] p-4 dark:bg-[#171717]">
              <div className="flex h-28 items-end gap-2">
                {[35, 50, 40, 70, 55, 80, 60, 85, 72, 90, 65, 95].map((h, idx) => (
                  <div
                    key={idx}
                    className="flex-1 rounded-t bg-gradient-to-t from-[#0d0d0d]/10 to-[#0d0d0d]/5 dark:from-white/15 dark:to-white/5"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          )}
          {el.type === 'table' && (
            <div className="rounded-lg border border-[#e5e5e5] dark:border-[#444654]">
              <div className="border-b border-[#e5e5e5] bg-[#f7f7f8] px-4 py-2 dark:border-[#444654] dark:bg-[#171717]">
                <div className="flex gap-8">
                  {['Targa', 'Cliente', 'Stato', 'Importo'].map((h) => (
                    <span key={h} className="text-[10px] font-medium uppercase text-[#8e8ea0]">{h}</span>
                  ))}
                </div>
              </div>
              {[1, 2, 3, 4].map((r) => (
                <div key={r} className="flex items-center gap-8 border-b border-[#e5e5e5]/50 px-4 py-2.5 last:border-0 dark:border-[#444654]/50">
                  <div className="h-2.5 w-16 rounded bg-[#e5e5e5] dark:bg-[#444654]" />
                  <div className="h-2.5 w-20 rounded bg-[#e5e5e5] dark:bg-[#444654]" />
                  <div className="h-5 w-14 rounded-full bg-[#0d0d0d]/5 dark:bg-white/10" />
                  <div className="h-2.5 w-12 rounded bg-[#e5e5e5] dark:bg-[#444654]" />
                </div>
              ))}
            </div>
          )}
          {el.type === 'status-bar' && (
            <div className="flex gap-3">
              {[
                { label: 'Bozza', color: 'bg-[#e5e5e5] dark:bg-[#444654]' },
                { label: 'Inviata', color: 'bg-[#0d0d0d]/5 dark:bg-white/10' },
                { label: 'Pagata', color: 'bg-[#0d0d0d]/10 dark:bg-white/15' },
              ].map((s) => (
                <div key={s.label} className={`flex-1 rounded-lg ${s.color} p-3`}>
                  <div className="text-[10px] font-medium text-[#6e6e80] dark:text-[#8e8ea0]">{s.label}</div>
                  <div className="mt-1 h-4 w-8 rounded bg-[#0d0d0d]/5 dark:bg-white/10" />
                </div>
              ))}
            </div>
          )}
          {el.type === 'list' && (
            <div className="space-y-2">
              {[1, 2, 3].map((r) => (
                <div key={r} className="flex items-center gap-3 rounded-lg bg-[#f7f7f8] px-4 py-3 dark:bg-[#171717]">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#0d0d0d] dark:bg-white" />
                  <div className="h-2.5 flex-1 rounded bg-[#e5e5e5] dark:bg-[#444654]" />
                  <div className="h-2.5 w-16 rounded bg-[#e5e5e5] dark:bg-[#444654]" />
                </div>
              ))}
            </div>
          )}
          {el.type === 'calendar' && (
            <div className="rounded-lg bg-[#f7f7f8] p-4 dark:bg-[#171717]">
              <div className="grid grid-cols-7 gap-1">
                {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, idx) => (
                  <div key={idx} className="py-1 text-center text-[10px] font-medium text-[#8e8ea0]">{d}</div>
                ))}
                {Array.from({ length: 35 }).map((_, idx) => {
                  const hasEvent = [4, 7, 12, 15, 19, 23, 27].includes(idx);
                  return (
                    <div
                      key={idx}
                      className={`flex h-8 items-center justify-center rounded text-xs ${
                        hasEvent
                          ? 'bg-[#0d0d0d]/5 dark:bg-white/10 font-medium text-[#0d0d0d] dark:text-white'
                          : 'text-[#8e8ea0]'
                      }`}
                    >
                      {idx + 1 <= 31 ? idx + 1 : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ProductDemo(): React.ReactElement {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  const rotateTab = useCallback((): void => {
    setActiveTab((prev) => {
      const idx = tabs.findIndex((t) => t.id === prev);
      return tabs[(idx + 1) % tabs.length].id;
    });
  }, []);

  useEffect(() => {
    if (isAutoRotating) {
      intervalRef.current = setInterval(rotateTab, AUTO_ROTATE_MS);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAutoRotating, rotateTab]);

  const handleTabClick = (tabId: string): void => {
    setActiveTab(tabId);
    setIsAutoRotating(false);
  };

  const activeTabIndex = tabs.findIndex((t) => t.id === activeTab);

  return (
    <section id="demo" ref={sectionRef} className="bg-white py-20 dark:bg-[#212121] lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold tracking-tight text-[#0d0d0d] dark:text-[#ececec] sm:text-4xl">
            Vedi MechMind in azione
          </h2>
        </motion.div>

        {/* Demo container */}
        <motion.div
          className="mx-auto mt-12 max-w-5xl"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-2xl dark:border-[#444654] dark:bg-[#2f2f2f]">
            {/* Tab bar */}
            <div className="flex border-b border-[#e5e5e5] bg-[#f7f7f8] dark:border-[#444654] dark:bg-[#171717]">
              {tabs.map((tab, i) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabClick(tab.id)}
                    className={`relative flex flex-1 items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-[#0d0d0d] dark:text-white'
                        : 'text-[#6e6e80] hover:text-[#0d0d0d] dark:text-[#8e8ea0] dark:hover:text-[#ececec]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {isActive && (
                      <motion.div
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0d0d0d] dark:bg-white"
                        layoutId="activeTab"
                        transition={{ duration: 0.3 }}
                      />
                    )}
                    {isAutoRotating && i === activeTabIndex && (
                      <motion.div
                        className="absolute bottom-0 left-0 h-0.5 bg-[#0d0d0d]/30 dark:bg-white/30"
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: AUTO_ROTATE_MS / 1000, ease: 'linear' }}
                        key={`progress-${activeTab}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="relative min-h-[400px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                >
                  <TabContent tabId={activeTab} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="mt-10 text-center"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 rounded-full bg-[#0d0d0d] dark:bg-white px-6 py-3 text-sm font-semibold text-white dark:text-[#0d0d0d] transition-all hover:bg-[#2f2f2f] dark:hover:bg-[#e5e5e5] active:scale-[0.97]"
          >
            Prova gratis — vedilo tu stesso &rarr;
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
