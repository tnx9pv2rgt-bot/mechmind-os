'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const navLinks = [
  { name: 'Funzionalit\u00e0', href: '#funzionalita' },
  { name: 'Prezzi', href: '#prezzi' },
  { name: 'FAQ', href: '#faq' },
] as const;

const menuVariants = {
  closed: {
    x: '100%',
    transition: { type: 'spring', stiffness: 400, damping: 40 },
  },
  open: {
    x: 0,
    transition: { type: 'spring', stiffness: 400, damping: 40 },
  },
} as const;

const menuItemVariants = {
  closed: { opacity: 0, x: 20 },
  open: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.1 + i * 0.05, duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  }),
} as const;

function handleSmoothScroll(
  e: React.MouseEvent<HTMLAnchorElement>,
  href: string,
  onComplete?: () => void,
): void {
  if (!href.startsWith('#')) return;
  e.preventDefault();
  const el = document.getElementById(href.slice(1));
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 64;
    window.scrollTo({ top, behavior: 'smooth' });
  }
  onComplete?.();
}

export default function MarketingNavbar(): React.ReactElement {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleScroll = useCallback((): void => {
    setIsScrolled(window.scrollY > 50);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = useCallback((): void => setIsMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback((): void => setIsMobileMenuOpen(p => !p), []);

  return (
    <>
      <header
        className={`
          fixed top-0 left-0 right-0 z-50 h-16
          transition-all duration-200
          bg-[#0d0d0d] border-b border-white/10
        `}
      >
        <nav className="relative mx-auto flex h-full max-w-7xl items-center justify-between px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex min-h-[44px] items-center gap-2 transition-opacity duration-200 hover:opacity-70">
            <span className="text-[19px] font-semibold tracking-tight text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              MechMind OS
            </span>
          </Link>

          {/* Desktop Navigation — absolute center */}
          <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleSmoothScroll(e, link.href)}
                className="rounded-full px-4 py-2.5 min-h-[44px] flex items-center text-[14px] font-medium text-[var(--text-tertiary)] transition-colors duration-200 hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--surface-elevated)] dark:hover:text-[var(--text-primary)]"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/demo"
              className="rounded-full px-4 py-2.5 min-h-[44px] flex items-center text-[14px] font-medium text-[var(--text-tertiary)] transition-colors duration-200 hover:text-[var(--text-primary)] dark:text-[var(--text-secondary)] dark:hover:text-[var(--text-primary)]"
            >
              Demo
            </Link>
            <Link
              href="/auth"
              className="rounded-full px-4 py-2.5 min-h-[44px] flex items-center text-[14px] font-medium text-[var(--text-tertiary)] transition-colors duration-200 hover:text-[var(--text-primary)] dark:text-[var(--text-secondary)] dark:hover:text-[var(--text-primary)]"
            >
              Accedi
            </Link>
            <Link
              href="/auth/register"
              className="rounded-full border border-[var(--border-default)] bg-white px-5 py-2.5 min-h-[44px] flex items-center text-[14px] font-semibold text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--surface-secondary)] active:scale-[0.97] dark:border-[var(--border-default)] dark:bg-[var(--surface-elevated)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--surface-active)]"
            >
              Prova gratis &rarr;
            </Link>
          </div>

          {/* Mobile: CTA + Menu */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/auth/register"
              className="rounded-full border border-[var(--border-default)] bg-white px-4 py-2 min-h-[44px] flex items-center text-[13px] font-semibold text-[var(--text-primary)] dark:border-[var(--border-default)] dark:bg-[var(--surface-elevated)] dark:text-[var(--text-primary)]"
            >
              Prova gratis
            </Link>
            <button
              type="button"
              onClick={toggleMobileMenu}
              className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-secondary)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--surface-elevated)]"
              aria-label={isMobileMenuOpen ? 'Chiudi menu' : 'Apri menu'}
              aria-expanded={isMobileMenuOpen}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isMobileMenuOpen ? (
                  <motion.div key="close" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }} transition={{ duration: 0.15 }}>
                    <span className="text-2xl">✕</span>
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ opacity: 0, rotate: 90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: -90 }} transition={{ duration: 0.15 }}>
                    <span className="text-2xl">☰</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMobileMenu}
              aria-hidden="true"
            />
            <motion.div
              className="fixed right-0 top-0 z-50 flex h-full w-[300px] flex-col bg-white dark:bg-[var(--surface-primary)] shadow-2xl md:hidden"
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
            >
              <div className="flex h-16 items-center justify-between px-6">
                <span className="text-[17px] font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Menu</span>
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-secondary)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--surface-elevated)]"
                  aria-label="Chiudi menu"
                >
                  <span className="text-2xl">✕</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2">
                <div className="flex flex-col gap-1">
                  {navLinks.map((link, i) => (
                    <motion.a
                      key={link.href}
                      href={link.href}
                      onClick={(e) => handleSmoothScroll(e, link.href, closeMobileMenu)}
                      custom={i}
                      variants={menuItemVariants}
                      initial="closed"
                      animate="open"
                      className="rounded-xl px-4 py-3 text-[17px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--surface-elevated)]"
                    >
                      {link.name}
                    </motion.a>
                  ))}
                </div>
                <div className="my-4 h-px bg-[var(--border-default)] dark:bg-[var(--border-default)]" />
                <motion.div
                  className="flex flex-col gap-3 px-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.3, duration: 0.3 } }}
                >
                  <Link
                    href="/demo"
                    onClick={closeMobileMenu}
                    className="flex h-[48px] items-center justify-center rounded-xl border border-[var(--border-default)] text-[15px] font-medium text-[var(--text-primary)] dark:border-[var(--border-default)] dark:text-[var(--text-primary)]"
                  >
                    Prova la demo
                  </Link>
                  <Link
                    href="/auth"
                    onClick={closeMobileMenu}
                    className="flex h-[48px] items-center justify-center rounded-xl border border-[var(--border-default)] text-[15px] font-medium text-[var(--text-primary)] dark:border-[var(--border-default)] dark:text-[var(--text-primary)]"
                  >
                    Accedi
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={closeMobileMenu}
                    className="flex h-[48px] items-center justify-center rounded-xl bg-[#0d0d0d] text-[15px] font-semibold text-white dark:bg-white dark:text-[var(--text-primary)]"
                  >
                    Prova gratis &rarr;
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer */}
      <div className="h-16" />
    </>
  );
}
