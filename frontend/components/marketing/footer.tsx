'use client';

import Link from 'next/link';

interface FooterLink {
  label: string;
  href: string;
  onClick?: () => void;
}

interface FooterLinkGroup {
  title: string;
  links: FooterLink[];
}

function openCookieSettings(): void {
  const reopen = (window as unknown as Record<string, unknown>).__mechMindReopenCookieBanner as
    | (() => void)
    | undefined;
  if (reopen) reopen();
}

const linkGroups: FooterLinkGroup[] = [
  {
    title: 'Prodotto',
    links: [
      { label: 'Funzionalit\u00e0', href: '#funzionalita' },
      { label: 'Prezzi', href: '#prezzi' },
      { label: 'Come funziona', href: '#come-funziona' },
      { label: 'ROI Calculator', href: '#roi' },
    ],
  },
  {
    title: 'Risorse',
    links: [
      { label: 'FAQ', href: '#faq' },
      { label: 'Perch\u00e9 MechMind', href: '#storie' },
      { label: 'Confronto', href: '#confronto' },
    ],
  },
  {
    title: 'Legale',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Termini', href: '/terms' },
      { label: 'Impostazioni cookie', href: '#', onClick: openCookieSettings },
    ],
  },
  {
    title: 'Contatti',
    links: [
      { label: 'info@mechmind.it', href: 'mailto:info@mechmind.it' },
    ],
  },
];

export function Footer(): React.ReactElement {
  return (
    <footer className="bg-[#0d0d0d] text-[#8e8ea0]">
      <div className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
        {/* Logo + description */}
        <div className="mb-12">
          <Link href="/" className="min-h-[44px] inline-flex items-center gap-2.5">
            <span className="text-xl font-bold text-white">MechMind OS</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#6e6e80]">
            Il gestionale cloud per officine meccaniche. Made in Italy.
          </p>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
          {linkGroups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#ececec]">
                {group.title}
              </h3>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {link.onClick ? (
                      <button
                        type="button"
                        onClick={link.onClick}
                        className="min-h-[44px] min-w-[44px] inline-flex items-center text-sm text-[#8e8ea0] transition-colors duration-200 hover:text-white"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <Link
                        href={link.href}
                        className="min-h-[44px] min-w-[44px] inline-flex items-center text-sm text-[#8e8ea0] transition-colors duration-200 hover:text-white"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="mt-16 border-t border-[#2f2f2f]" />

        {/* Bottom */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-[#6e6e80]">
            &copy; 2026 MechMind OS. Tutti i diritti riservati.
          </p>
          <p className="text-sm text-[#444654]">
            Made with &hearts; in Italy
          </p>
        </div>
      </div>
    </footer>
  );
}
